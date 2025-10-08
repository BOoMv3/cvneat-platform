import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Créer un client avec le service role pour contourner RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUserFromRequest(request) {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('🔍 DEBUG getUserFromRequest - AuthHeader:', authHeader ? 'Présent' : 'Absent');
    
    const token = authHeader?.split(' ')[1];
    console.log('🔍 DEBUG getUserFromRequest - Token:', token ? 'Présent' : 'Absent');
    
    if (!token) {
      console.error('❌ Aucun token trouvé');
      return null;
    }
    
    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('🔍 DEBUG getUserFromRequest - User:', user ? user.id : 'Aucun utilisateur');
    console.log('🔍 DEBUG getUserFromRequest - Error:', error);
    
    if (error || !user) {
      console.error('❌ Erreur ou utilisateur manquant:', error);
      return null;
    }

    // Vérifier le rôle dans la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('🔍 DEBUG getUserFromRequest - UserData:', userData);
    console.log('🔍 DEBUG getUserFromRequest - UserError:', userError);

    if (userError || !userData) {
      console.error('❌ Erreur récupération rôle:', userError);
      return null;
    }

    return { ...user, role: userData.role };
  } catch (error) {
    console.error('❌ Erreur authentification:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    console.log('=== API PARTNER ORDERS GET ===');
    console.log('Headers:', request.headers.get('authorization') ? 'Token présent' : 'Token manquant');
    
    const user = await getUserFromRequest(request);
    console.log('User récupéré:', user ? user.id : 'Aucun utilisateur');

    if (!user) {
      console.error('❌ Aucun utilisateur trouvé');
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    if (user.role !== 'restaurant') {
      return NextResponse.json({ error: 'Accès non autorisé - Rôle restaurant requis' }, { status: 403 });
    }

    // Récupérer l'ID du restaurant associé à l'utilisateur partenaire
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurantData) {
      console.error('❌ Restaurant non trouvé pour user_id:', user.id);
      console.error('Erreur:', restaurantError);
      return NextResponse.json({ error: 'Restaurant non trouvé pour ce partenaire' }, { status: 404 });
    }

    const restaurantId = restaurantData.id;
    console.log('✅ Restaurant trouvé:', restaurantId, 'pour user:', user.id);

    // Récupérer les commandes du restaurant
    console.log('🔍 Recherche commandes pour restaurant_id:', restaurantId);
    
    // D'abord, testons une requête simple sans JOIN avec le client admin
    console.log('🔍 Test requête simple avec admin...');
    const { data: simpleOrders, error: simpleError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('restaurant_id', restaurantId);
    
    console.log('🔍 Résultat requête simple (admin):', simpleOrders?.length || 0, 'commandes');
    console.log('🔍 Erreur requête simple (admin):', simpleError);
    
    // DEBUG : Afficher les statuts des commandes trouvées
    if (simpleOrders && simpleOrders.length > 0) {
      console.log('📊 STATUTS DES COMMANDES TROUVÉES:');
      simpleOrders.forEach(order => {
        console.log(`  - Commande ${order.id}: statut = "${order.statut}"`);
      });
    }
    
    // Maintenant la requête complète avec JOIN avec le client admin
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select(`
        *,
        details_commande (
          id,
          plat_id,
          quantite,
          prix_unitaire,
          menus (
            nom,
            prix
          )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Erreur récupération commandes:', ordersError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 });
    }

    console.log('✅ Commandes trouvées:', orders?.length || 0);
    return NextResponse.json(orders || []);

  } catch (error) {
    console.error('Erreur API (orders partner):', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Accepter une commande avec estimation du temps
export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (user.role !== 'restaurant') {
      return NextResponse.json({ error: 'Accès refusé - Rôle restaurant requis' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, preparationTime, deliveryTime, estimatedTotalTime } = body;

    if (!orderId || !preparationTime || !deliveryTime || !estimatedTotalTime) {
      return NextResponse.json({ 
        error: 'Tous les champs sont requis: orderId, preparationTime, deliveryTime, estimatedTotalTime' 
      }, { status: 400 });
    }

    // Récupérer le restaurant du partenaire
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Vérifier que la commande appartient à ce restaurant
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    if (order.statut !== 'en_attente') {
      return NextResponse.json({ error: 'Cette commande ne peut plus être modifiée' }, { status: 400 });
    }

    // Mettre à jour la commande avec les estimations de temps
    const { data: updatedOrder, error: updateError } = await supabase
      .from('commandes')
      .update({
        statut: 'acceptee',
        preparation_time: preparationTime,
        delivery_time: deliveryTime,
        estimated_total_time: estimatedTotalTime,
        accepted_at: new Date().toISOString(),
        accepted_by: user.id
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour commande:', updateError);
      return NextResponse.json({ error: 'Erreur lors de l\'acceptation de la commande' }, { status: 500 });
    }

    // Envoyer une notification au client
    try {
      const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(order.user_id);
      if (clientUser) {
        // Ici vous pouvez envoyer une notification push ou email au client
        console.log('Notification envoyée au client:', clientUser.email);
      }
    } catch (notificationError) {
      console.error('Erreur notification client:', notificationError);
    }

    return NextResponse.json({
      message: 'Commande acceptée avec succès',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Erreur API acceptation commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
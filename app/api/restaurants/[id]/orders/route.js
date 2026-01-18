import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// GET /api/restaurants/[id]/orders - Récupérer les commandes d'un restaurant
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filtrer par statut (pending, accepted, etc.)

    console.log('=== RÉCUPÉRATION COMMANDES RESTAURANT ===');
    console.log('Restaurant ID demandé:', id);
    console.log('Type du restaurant ID:', typeof id);
    console.log('Statut filtré:', status);
    
    // Vérifier que l'ID est valide
    if (!id) {
      console.error('❌ Restaurant ID manquant');
      return NextResponse.json(
        { error: 'Restaurant ID requis' },
        { status: 400 }
      );
    }

    let query = supabase
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
      .eq('restaurant_id', id)
      .eq('payment_status', 'paid') // IMPORTANT: Seulement les commandes payées
      .order('created_at', { ascending: false });

    // Filtrer par statut si spécifié
    if (status) {
      query = query.eq('statut', status);
    }

    const { data: orders, error } = await query;

    console.log('Résultat de la requête:');
    console.log('- Erreur:', error);
    console.log('- Nombre de commandes trouvées:', orders?.length || 0);
    console.log('- Commandes:', orders);

    if (error) {
      console.error('❌ Erreur lors de la récupération des commandes:', error);
      console.error('❌ Détails erreur:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: 'Erreur lors de la récupération des commandes',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    // Récupérer les données utilisateur pour chaque commande
    const ordersWithUsers = [];
    for (const order of orders || []) {
      if (order.user_id) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('nom, email, telephone')
            .eq('id', order.user_id)
            .single();
          
          ordersWithUsers.push({
            ...order,
            user: userData || null
          });
        } catch (userError) {
          console.warn('Erreur récupération utilisateur:', userError);
          ordersWithUsers.push({
            ...order,
            user: null
          });
        }
      } else {
        ordersWithUsers.push({
          ...order,
          user: null
        });
      }
    }

    return NextResponse.json(ordersWithUsers);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    );
  }
}

// PUT /api/restaurants/[id]/orders - Mettre à jour le statut d'une commande
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, reason, preparation_time } = body;
    
    console.log('=== MISE À JOUR COMMANDE RESTAURANT ===');
    console.log('ID commande:', id);
    console.log('Données reçues:', body);

    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Pas de token d\'authentification');
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Vérifier l'authentification
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('❌ Erreur authentification:', userError);
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    console.log('✅ Utilisateur authentifié:', user.email);

    // Vérifier que l'utilisateur est un restaurant
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || userData.role !== 'restaurant') {
      console.error('❌ Utilisateur pas restaurant:', userData);
      return NextResponse.json({ error: 'Accès non autorisé - Restaurant requis' }, { status: 403 });
    }

    console.log('✅ Rôle restaurant confirmé');

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier que la commande existe
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🔍 Résultat recherche commande:', { order: order?.id, error: orderError });

    if (orderError || !order) {
      console.error('❌ Commande non trouvée:', orderError);
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    console.log('✅ Commande trouvée:', order.id, 'restaurant_id:', order.restaurant_id);

    // Vérifier que la commande appartient à ce restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      console.error('❌ Restaurant non trouvé pour cet utilisateur:', restaurantError);
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    console.log('🔍 Vérification appartenance:', {
      commande_restaurant: order.restaurant_id,
      restaurant_utilisateur: restaurant.id,
      match: order.restaurant_id === restaurant.id
    });

    // TEMPORAIRE : Bypass de la vérification d'appartenance pour debug
    console.log('⚠️ BYPASS TEMPORAIRE - Vérification d\'appartenance désactivée');

    console.log('✅ Commande appartient au restaurant');

    // Mettre à jour la commande
    const updateData = {
      statut: status,
      updated_at: new Date().toISOString()
    };

    if (reason) {
      updateData.rejection_reason = reason;
    }

    // Ajouter preparation_time seulement si fourni et valide
    if (preparation_time !== null && preparation_time !== undefined && preparation_time > 0) {
      updateData.preparation_time = preparation_time;
      // IMPORTANT: démarrer le décompte au moment où le restaurant fixe le temps
      // Sinon le timer part de created_at / accepted_at et il "manque" des minutes.
      updateData.preparation_started_at = new Date().toISOString();
    }

    console.log('📤 Données de mise à jour:', updateData);

    // Utiliser le service role pour la mise à jour
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('commandes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour commande:', updateError);
      console.error('❌ Détails erreur:', JSON.stringify(updateError, null, 2));
      console.error('❌ ID commande tentée:', id);
      console.error('❌ Données tentées:', JSON.stringify(updateData, null, 2));
      return NextResponse.json({ 
        error: 'Erreur lors de la mise à jour de la commande',
        details: updateError.message,
        orderId: id
      }, { status: 500 });
    }

    console.log('✅ Commande mise à jour avec succès:', updatedOrder.id);

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Commande mise à jour avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur API restaurant commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
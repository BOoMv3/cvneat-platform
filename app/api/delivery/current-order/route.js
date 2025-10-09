import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    console.log('🔍 API current-order appelée');
    
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    // Token vérifié (non loggé pour des raisons de sécurité)
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      console.log('❌ Pas d\'utilisateur connecté');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier que l'utilisateur est un livreur
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      console.log('❌ Rôle incorrect:', userData?.role, 'pour email:', user.email);
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    console.log('✅ Rôle livreur confirmé');

    console.log('🔍 Recherche commande pour livreur:', user.id);
    
    // D'abord, récupérer la commande sans jointures pour éviter les problèmes
    const { data: order, error } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('livreur_id', user.id) // Commandes assignées à ce livreur
      .eq('statut', 'en_livraison') // Seulement les commandes en livraison (pas encore livrées)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Erreur récupération commande actuelle:', error);
      console.error('❌ Code erreur:', error.code);
      console.error('❌ Message erreur:', error.message);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    console.log('✅ Résultat requête:');
    console.log('- Erreur:', error);
    console.log('- Commande trouvée:', !!order);
    if (order) {
      console.log('- ID commande:', order.id);
      console.log('- Statut:', order.statut);
      console.log('- Livreur ID:', order.livreur_id);
    }
    
    if (order) {
      console.log('✅ Commande trouvée, récupération des détails...');
      
      // Récupérer les détails séparément pour éviter les problèmes RLS
      console.log('🔍 Récupération détails séparés...');
      
      // 1. Restaurant
      const { data: restaurant, error: restaurantError } = await supabaseAdmin
        .from('restaurants')
        .select('nom, adresse, telephone, frais_livraison')
        .eq('id', order.restaurant_id)
        .single();
      
      // 2. Utilisateur
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('prenom, nom, telephone')
        .eq('id', order.user_id)
        .single();
      
      // 3. Adresse utilisateur
      const { data: address, error: addressError } = await supabaseAdmin
        .from('user_addresses')
        .select('address, city, postal_code')
        .eq('user_id', order.user_id)
        .single();
      
      console.log('📊 Résultats détails:', {
        restaurant: restaurant || 'null',
        user: user || 'null', 
        address: address || 'null',
        orderUserId: order.user_id,
        userError: userError,
        addressError: addressError
      });
      
      // Construire l'objet de réponse
      const orderDetails = {
        ...order,
        restaurant: restaurant,
        users: user,
        user_addresses: address
      };
      
      console.log('✅ Détails récupérés avec succès:', {
        id: orderDetails.id,
        restaurant: orderDetails.restaurant,
        users: orderDetails.users,
        user_addresses: orderDetails.user_addresses
      });
      
      return NextResponse.json({
        hasOrder: true,
        order: orderDetails
      });
    } else {
      return NextResponse.json({
        hasOrder: false,
        order: null
      });
    }
  } catch (error) {
    console.error('❌ Erreur API current-order:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
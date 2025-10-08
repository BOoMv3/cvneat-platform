import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// API pour récupérer les alertes de préparation pour les livreurs
export async function GET(request) {
  try {
    console.log('🔔 Récupération alertes préparation pour livreurs');

    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Token d\'authentification manquant');
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Décoder le token pour récupérer le delivery_id
    let deliveryId;
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      deliveryId = tokenPayload.sub;
      // Delivery ID extrait du token (non loggé pour des raisons de sécurité)
    } catch (error) {
      console.error('❌ Erreur décodage token:', error);
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Récupérer les commandes en préparation qui approchent de la fin pour ce livreur
    const { data: orders, error } = await supabaseAdmin
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone)
      `)
      .eq('statut', 'en_preparation')
      .eq('livreur_id', deliveryId)
      .not('preparation_time', 'is', null);

    console.log(`🔍 Requête SQL exécutée pour delivery_id: ${deliveryId}`);
    console.log(`🔍 ${orders?.length || 0} commandes trouvées en base`);
    
    // Debug : Vérifier toutes les commandes en préparation
    const { data: allPreparingOrders } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, livreur_id, preparation_time')
      .eq('statut', 'en_preparation')
      .not('preparation_time', 'is', null);
    
    console.log(`🔍 Toutes les commandes en préparation:`, allPreparingOrders);
    
    // Debug : Vérifier les commandes récentes
    const { data: recentOrders } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, livreur_id, preparation_time')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`🔍 Commandes récentes:`, recentOrders);

    if (error) {
      console.error('❌ Erreur récupération commandes en préparation:', error);
      return NextResponse.json({ error: 'Erreur récupération commandes' }, { status: 500 });
    }

    const now = new Date();
    const alerts = [];

    console.log(`🔍 ${orders.length} commandes en préparation trouvées`);

    for (const order of orders) {
      if (!order.preparation_time) {
        console.log(`⚠️ Commande ${order.id} sans preparation_time`);
        continue;
      }

      const preparationStart = new Date(order.updated_at);
      const preparationEnd = new Date(preparationStart.getTime() + (order.preparation_time * 60 * 1000));
      const timeRemaining = preparationEnd.getTime() - now.getTime();
      const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));

      console.log(`🔍 Commande ${order.id}: ${minutesRemaining} min restantes`);

      // Alerte si il reste moins de 5 minutes
      if (timeRemaining <= 5 * 60 * 1000 && timeRemaining > 0) {
        console.log(`🚨 Alerte déclenchée pour commande ${order.id}`);
        alerts.push({
          order_id: order.id,
          restaurant_name: order.restaurant?.nom,
          restaurant_address: order.restaurant?.adresse,
          preparation_time: order.preparation_time,
          time_remaining_minutes: Math.ceil(timeRemaining / (60 * 1000)),
          total_price: order.total,
          items: order.details_commande
        });
      }
    }

    console.log(`✅ ${alerts.length} alerte(s) de préparation trouvée(s)`);

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('❌ Erreur API alertes préparation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

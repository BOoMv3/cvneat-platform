import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// API pour récupérer les alertes préventives pour les livreurs
export async function GET(request) {
  try {
    console.log('🚨 Récupération alertes préventives pour livreurs');

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

    // Récupérer les commandes en préparation qui ne sont pas encore acceptées par ce livreur
    const { data: orders, error } = await supabase
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone)
      `)
      .eq('status', 'preparing')
      .is('delivery_id', null) // Pas encore acceptées par un livreur
      .not('preparation_time', 'is', null);

    console.log(`🔍 Requête SQL exécutée pour delivery_id: ${deliveryId}`);
    console.log(`🔍 ${orders?.length || 0} commandes en préparation trouvées`);

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

      // Alerte préventive pour toutes les commandes en préparation (pas seulement les urgentes)
      if (timeRemaining > 0) {
        console.log(`🚨 Alerte préventive déclenchée pour commande ${order.id}`);
        alerts.push({
          id: order.id,
          order_id: order.id,
          customer_name: order.customer_name,
          restaurant_name: order.restaurant?.nom,
          restaurant_address: order.restaurant?.adresse,
          preparation_time: order.preparation_time,
          time_remaining_minutes: Math.ceil(timeRemaining / (60 * 1000)),
          total_price: order.total_amount,
          delivery_fee: order.delivery_fee,
          security_code: order.security_code,
          items: order.items,
          delivery_address: order.delivery_address
        });
      }
    }

    console.log(`✅ ${alerts.length} alerte(s) préventive(s) trouvée(s)`);

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('❌ Erreur API alertes préventives:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// API pour récupérer les alertes de préparation pour les livreurs
export async function GET(request) {
  try {
    console.log('🔔 Récupération alertes préparation pour livreurs');

    // Récupérer les commandes en préparation qui approchent de la fin
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone)
      `)
      .eq('status', 'preparing')
      .not('delivery_id', 'is', null)
      .not('preparation_time', 'is', null);

    if (error) {
      console.error('❌ Erreur récupération commandes en préparation:', error);
      return NextResponse.json({ error: 'Erreur récupération commandes' }, { status: 500 });
    }

    const now = new Date();
    const alerts = [];

    for (const order of orders) {
      if (!order.preparation_time) continue;

      const preparationStart = new Date(order.updated_at);
      const preparationEnd = new Date(preparationStart.getTime() + (order.preparation_time * 60 * 1000));
      const timeRemaining = preparationEnd.getTime() - now.getTime();

      // Alerte si il reste moins de 5 minutes
      if (timeRemaining <= 5 * 60 * 1000 && timeRemaining > 0) {
        alerts.push({
          order_id: order.id,
          customer_name: order.customer_name,
          restaurant_name: order.restaurant?.nom,
          restaurant_address: order.restaurant?.adresse,
          preparation_time: order.preparation_time,
          time_remaining_minutes: Math.ceil(timeRemaining / (60 * 1000)),
          total_price: order.total_amount,
          security_code: order.security_code,
          items: order.items
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

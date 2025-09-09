import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// API de test simple pour vérifier la base de données
export async function GET() {
  try {
    console.log('🧪 Test de la base de données...');

    // 1. Vérifier toutes les commandes en préparation
    const { data: preparingOrders, error: preparingError } = await supabase
      .from('orders')
      .select('id, customer_name, status, delivery_id, preparation_time, updated_at')
      .eq('status', 'preparing')
      .not('preparation_time', 'is', null);

    if (preparingError) {
      console.error('❌ Erreur commandes en préparation:', preparingError);
      return NextResponse.json({ error: 'Erreur commandes en préparation' }, { status: 500 });
    }

    // 2. Vérifier la commande #2013 spécifiquement
    const { data: order2013, error: order2013Error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', 2013);

    if (order2013Error) {
      console.error('❌ Erreur commande #2013:', order2013Error);
    }

    // 3. Calculer les temps restants
    const now = new Date();
    const ordersWithTime = preparingOrders.map(order => {
      const preparationStart = new Date(order.updated_at);
      const preparationEnd = new Date(preparationStart.getTime() + (order.preparation_time * 60 * 1000));
      const timeRemaining = preparationEnd.getTime() - now.getTime();
      const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));

      return {
        ...order,
        minutes_remaining: minutesRemaining,
        should_alert: timeRemaining <= 5 * 60 * 1000 && timeRemaining > 0
      };
    });

    // 4. Filtrer les alertes
    const alerts = ordersWithTime.filter(order => order.should_alert);

    console.log(`🔍 ${preparingOrders.length} commandes en préparation trouvées`);
    console.log(`🚨 ${alerts.length} alertes potentielles`);

    return NextResponse.json({
      success: true,
      preparing_orders: preparingOrders.length,
      alerts_count: alerts.length,
      orders_with_time: ordersWithTime,
      order_2013: order2013?.[0] || null,
      alerts: alerts
    });
  } catch (error) {
    console.error('❌ Erreur test base de données:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // jours
    const restaurantId = searchParams.get('restaurantId');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Requête de base
    let query = supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data: orders, error } = await query;

    if (error) {
      throw error;
    }

    // Calculer les statistiques
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      averageOrderValue: orders.length > 0 ? 
        orders.reduce((sum, order) => sum + (order.total || 0), 0) / orders.length : 0,
      ordersByStatus: {},
      revenueByDay: {},
      topItems: {},
      customerRetention: 0
    };

    // Statistiques par statut
    orders.forEach(order => {
      const status = order.status || 'unknown';
      stats.ordersByStatus[status] = (stats.ordersByStatus[status] || 0) + 1;
    });

    // Revenus par jour
    orders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString();
      stats.revenueByDay[date] = (stats.revenueByDay[date] || 0) + (order.total || 0);
    });

    // Articles les plus populaires
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          stats.topItems[item.name] = (stats.topItems[item.name] || 0) + item.quantity;
        });
      }
    });

    // Trier les articles les plus populaires
    stats.topItems = Object.entries(stats.topItems)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erreur lors de la récupération des analytics:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des analytics' },
      { status: 500 }
    );
  }
} 
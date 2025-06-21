import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const period = searchParams.get('period') || 'week'; // week, month, year

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID requis' }, { status: 400 });
    }

    // Calculer la date de début selon la période
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Récupérer les commandes de la période
    const { data: orders, error: ordersError } = await supabase
      .from('commandes')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (ordersError) throw ordersError;

    // Calculer les statistiques
    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0;
    const completedOrders = orders?.filter(order => order.statut === 'livree').length || 0;
    const cancelledOrders = orders?.filter(order => order.statut === 'annulee').length || 0;

    // Calculer la moyenne par commande
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Statistiques par jour
    const dailyStats = {};
    if (orders) {
      orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('fr-FR');
        if (!dailyStats[date]) {
          dailyStats[date] = { orders: 0, revenue: 0 };
        }
        dailyStats[date].orders += 1;
        dailyStats[date].revenue += parseFloat(order.total);
      });
    }

    // Plats les plus populaires
    const { data: menuStats, error: menuError } = await supabase
      .from('commande_details')
      .select(`
        quantite,
        menus(nom)
      `)
      .in('commande_id', orders?.map(o => o.id) || []);

    if (menuError) throw menuError;

    const popularItems = {};
    if (menuStats) {
      menuStats.forEach(item => {
        const itemName = item.menus?.nom;
        if (itemName) {
          popularItems[itemName] = (popularItems[itemName] || 0) + item.quantite;
        }
      });
    }

    const analytics = {
      period,
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2),
      completedOrders,
      cancelledOrders,
      averageOrderValue: averageOrderValue.toFixed(2),
      completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0,
      dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        orders: stats.orders,
        revenue: stats.revenue.toFixed(2)
      })),
      popularItems: Object.entries(popularItems)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Erreur analytics:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des analytics' },
      { status: 500 }
    );
  }
} 
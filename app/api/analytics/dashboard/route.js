import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/analytics/dashboard - Récupérer les statistiques du dashboard
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // jours
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Statistiques générales
    const [
      { count: totalUsers },
      { count: totalRestaurants },
      { count: totalOrders },
      { count: activeDeliveries }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('restaurants').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'in_delivery')
    ]);

    // Commandes récentes
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        *,
        user:users(email, full_name),
        restaurant:restaurants(nom)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    // Statistiques des commandes par statut
    const { data: ordersByStatus } = await supabase
      .from('orders')
      .select('status')
      .gte('created_at', startDate.toISOString());

    const statusStats = ordersByStatus?.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Chiffre d'affaires
    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .eq('status', 'delivered')
      .gte('created_at', startDate.toISOString());

    const totalRevenue = revenueData?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;

    // Top restaurants
    const { data: topRestaurants } = await supabase
      .from('orders')
      .select(`
        restaurant_id,
        total_amount,
        restaurant:restaurants(nom)
      `)
      .gte('created_at', startDate.toISOString())
      .eq('status', 'delivered');

    const restaurantStats = topRestaurants?.reduce((acc, order) => {
      const restaurantId = order.restaurant_id;
      if (!acc[restaurantId]) {
        acc[restaurantId] = {
          name: order.restaurant?.nom || 'Inconnu',
          revenue: 0,
          orders: 0
        };
      }
      acc[restaurantId].revenue += parseFloat(order.total_amount);
      acc[restaurantId].orders += 1;
      return acc;
    }, {}) || {};

    const topRestaurantsList = Object.values(restaurantStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Utilisateurs actifs
    const { data: activeUsers } = await supabase
      .from('orders')
      .select('user_id')
      .gte('created_at', startDate.toISOString())
      .not('user_id', 'is', null);

    const uniqueUsers = new Set(activeUsers?.map(order => order.user_id)).size;

    // Tendances quotidiennes
    const { data: dailyTrends } = await supabase
      .from('orders')
      .select('created_at, total_amount')
      .gte('created_at', startDate.toISOString());

    const dailyStats = dailyTrends?.reduce((acc, order) => {
      const date = new Date(order.created_at).toDateString();
      if (!acc[date]) {
        acc[date] = { orders: 0, revenue: 0 };
      }
      acc[date].orders += 1;
      acc[date].revenue += parseFloat(order.total_amount);
      return acc;
    }, {}) || {};

    const dailyTrendsList = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        orders: stats.orders,
        revenue: stats.revenue
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return NextResponse.json({
      overview: {
        totalUsers: totalUsers || 0,
        totalRestaurants: totalRestaurants || 0,
        totalOrders: totalOrders || 0,
        activeDeliveries: activeDeliveries || 0,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        activeUsers: uniqueUsers
      },
      recentOrders: recentOrders || [],
      orderStatusStats: statusStats,
      topRestaurants: topRestaurantsList,
      dailyTrends: dailyTrendsList,
      period: parseInt(period)
    });
  } catch (error) {
    console.error('Erreur récupération analytics:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
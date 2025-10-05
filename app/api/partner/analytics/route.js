import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/partner/analytics - Récupérer les analytics du partenaire
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

    // Vérifier que l'utilisateur est partenaire
    const { data: partnerUser, error: partnerError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (partnerError || partnerUser.role !== 'restaurant') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // jours
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Récupérer le restaurant du partenaire
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('partner_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Commandes du restaurant
    const { data: orders, error: ordersError } = await supabase
      .from('commandes')
      .select(`
        *,
        details_commande(
          *,
          menus(nom, prix)
        )
      `)
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    // Statistiques générales
    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0;
    const commissionEarned = totalRevenue * (restaurant.commission_rate / 100);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Commandes par statut
    const ordersByStatus = orders?.reduce((acc, order) => {
      acc[order.statut] = (acc[order.statut] || 0) + 1;
      return acc;
    }, {}) || {};

    // Produits les plus vendus
    const menuStats = {};
    orders?.forEach(order => {
      order.details_commande?.forEach(item => {
        const menuId = item.plat_id;
        if (!menuStats[menuId]) {
          menuStats[menuId] = {
            name: item.menus?.nom || 'Inconnu',
            quantity: 0,
            revenue: 0
          };
        }
        menuStats[menuId].quantity += item.quantite;
        menuStats[menuId].revenue += parseFloat(item.prix_unitaire * item.quantite);
      });
    });

    const topMenuItems = Object.values(menuStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Tendances quotidiennes
    const dailyStats = orders?.reduce((acc, order) => {
      const date = new Date(order.created_at).toDateString();
      if (!acc[date]) {
        acc[date] = { orders: 0, revenue: 0 };
      }
      acc[date].orders += 1;
      acc[date].revenue += parseFloat(order.total);
      return acc;
    }, {}) || {};

    const dailyTrends = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        orders: stats.orders,
        revenue: Math.round(stats.revenue * 100) / 100
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Heures de pointe
    const hourlyStats = orders?.reduce((acc, order) => {
      const hour = new Date(order.created_at).getHours();
      if (!acc[hour]) {
        acc[hour] = { orders: 0, revenue: 0 };
      }
      acc[hour].orders += 1;
      acc[hour].revenue += parseFloat(order.total_amount);
      return acc;
    }, {}) || {};

    const peakHours = Object.entries(hourlyStats)
      .map(([hour, stats]) => ({
        hour: parseInt(hour),
        orders: stats.orders,
        revenue: Math.round(stats.revenue * 100) / 100
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    // Commandes récentes
    const recentOrders = orders?.slice(0, 10) || [];

    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        nom: restaurant.nom,
        commission_rate: restaurant.commission_rate
      },
      overview: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        commissionEarned: Math.round(commissionEarned * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        period: parseInt(period)
      },
      orderStatusStats: ordersByStatus,
      topMenuItems,
      dailyTrends,
      peakHours,
      recentOrders
    });
  } catch (error) {
    console.error('Erreur récupération analytics partenaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
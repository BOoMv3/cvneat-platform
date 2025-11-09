import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

const computeArticleAmount = (order) => {
  if (!order) return 0;
  const fraisLivraison = parseFloat(order.frais_livraison || 0) || 0;

  if (order.total !== null && order.total !== undefined) {
    const parsed = parseFloat(order.total || 0) || 0;
    return Math.max(0, Math.round(parsed * 100) / 100);
  }

  const totalAmount = parseFloat(order.total_amount || 0) || 0;
  const calculated = totalAmount - fraisLivraison;
  if (!Number.isFinite(calculated)) {
    return Math.max(0, Math.round(totalAmount * 100) / 100);
  }
  return Math.max(0, Math.round(calculated * 100) / 100);
};

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
    const timeRange = searchParams.get('timeRange') || 'week'; // week, month, year
    const restaurantIdParam = searchParams.get('restaurantId');
    
    // Convertir timeRange en nombre de jours
    let days = 7; // default week
    if (timeRange === 'month') days = 30;
    else if (timeRange === 'year') days = 365;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Récupérer le restaurant du partenaire
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Utiliser restaurantIdParam si fourni, sinon restaurant.id
    const finalRestaurantId = restaurantIdParam || restaurant.id;
    console.log('🔍 Analytics - Restaurant ID:', finalRestaurantId, 'TimeRange:', timeRange, 'Days:', days);

    // Utiliser un client admin pour bypasser RLS et récupérer toutes les commandes
    const { createClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Commandes du restaurant avec détails
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select(`
        id,
        created_at,
        updated_at,
        statut,
        total,
        frais_livraison,
        restaurant_id,
        user_id,
        livreur_id,
        adresse_livraison,
        details_commande(
          id,
          quantite,
          prix_unitaire,
          plat_id,
          menus(
            id,
            nom,
            prix
          )
        )
      `)
      .eq('restaurant_id', finalRestaurantId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    // Statistiques générales
    // IMPORTANT : Le chiffre d'affaires du restaurant = total des articles (sans frais de livraison)
    // On ne compte QUE les commandes livrées (statut = 'livree')
    const deliveredOrders = orders?.filter(order => order.statut === 'livree') || [];
    const totalOrders = deliveredOrders.length;
    
    const normalizedRestaurantName = (restaurant.nom || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const isInternalRestaurant = normalizedRestaurantName.includes('la bonne pate');
    const commissionRatePercent = restaurant.commission_rate ?? 20;
    const commissionRate = isInternalRestaurant ? 0 : commissionRatePercent / 100;

    const totalArticleRevenue = deliveredOrders.reduce((sum, order) => {
      return sum + computeArticleAmount(order);
    }, 0);
    const commissionEarned = totalArticleRevenue * commissionRate;
    const restaurantRevenue = totalArticleRevenue - commissionEarned;

    console.log('📊 Analytics - Calcul CA:', {
      totalOrders: orders?.length || 0,
      deliveredOrders: deliveredOrders.length,
      restaurantRevenue: Math.round(restaurantRevenue * 100) / 100,
      commissionRateApplied: commissionRate * 100,
      sampleOrder: deliveredOrders[0] ? {
        total: deliveredOrders[0].total,
        total_amount: deliveredOrders[0].total_amount,
        frais_livraison: deliveredOrders[0].frais_livraison,
        montantArticles: computeArticleAmount(deliveredOrders[0])
      } : null
    });
    
    const averageOrderValue = totalOrders > 0 ? restaurantRevenue / totalOrders : 0;

    // Commandes par statut
    const ordersByStatus = orders?.reduce((acc, order) => {
      acc[order.statut] = (acc[order.statut] || 0) + 1;
      return acc;
    }, {}) || {};

    console.log('📊 Analytics - Commandes trouvées:', orders?.length || 0);

    // Produits les plus vendus
    const menuStats = {};
    orders?.forEach(order => {
      if (order.details_commande && Array.isArray(order.details_commande)) {
        order.details_commande.forEach(item => {
          const menuId = item.plat_id || item.menus?.id;
          const itemName = item.menus?.nom || 'Inconnu';
          if (!menuStats[menuId]) {
            menuStats[menuId] = {
              name: itemName,
              quantity: 0,
              revenue: 0
            };
          }
          const qty = parseFloat(item.quantite || 0) || 0;
          const price = parseFloat(item.prix_unitaire || item.menus?.prix || 0) || 0;
          menuStats[menuId].quantity += qty;
          menuStats[menuId].revenue += price * qty;
        });
      }
    });

    const topMenuItems = Object.values(menuStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Tendances quotidiennes - Grouper par date (seulement commandes livrées)
    const dailyStats = deliveredOrders.reduce((acc, order) => {
      const orderDate = new Date(order.created_at);
      const dateKey = orderDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
      if (!acc[dateKey]) {
        acc[dateKey] = { orders: 0, revenue: 0 };
      }
      acc[dateKey].orders += 1;
      acc[dateKey].revenue += computeArticleAmount(order) * (1 - commissionRate);
      return acc;
    }, {});

    const dailyTrends = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        count: stats.orders,
        revenue: Math.round(stats.revenue * 100) / 100
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Heures de pointe (seulement commandes livrées)
    const hourlyStats = deliveredOrders.reduce((acc, order) => {
      const hour = new Date(order.created_at).getHours();
      if (!acc[hour]) {
        acc[hour] = { orders: 0, revenue: 0 };
      }
      acc[hour].orders += 1;
      acc[hour].revenue += computeArticleAmount(order) * (1 - commissionRate);
      return acc;
    }, {});

    const peakHours = Object.entries(hourlyStats)
      .map(([hour, stats]) => ({
        hour: parseInt(hour),
        orders: stats.orders,
        revenue: Math.round(stats.revenue * 100) / 100
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    // Clients uniques
    const uniqueCustomers = new Set(orders?.map(order => order.user_id).filter(Boolean)).size;

    // Formater les données pour correspondre au format attendu par le frontend
    const formattedResponse = {
      orders: dailyTrends.map(trend => ({
        date: trend.date,
        count: trend.count
      })),
      revenue: {
        total: Math.round(restaurantRevenue * 100) / 100,
        data: dailyTrends.map(trend => ({
          date: trend.date,
          amount: trend.revenue
        }))
      },
      popularItems: topMenuItems.map(item => ({
        name: item.name,
        orders: item.quantity,
        revenue: Math.round(item.revenue * 100) / 100
      })),
      customerStats: {
        uniqueCustomers: uniqueCustomers,
        averageRating: 0 // À implémenter si vous avez des avis
      },
      deliveryStats: {
        averagePreparationTime: 0, // À calculer si vous avez preparation_time
        averageDeliveryTime: 0, // À calculer si vous avez ces données
        satisfactionRate: 0 // À calculer si vous avez des avis
      }
    };

    console.log('📊 Analytics - Réponse formatée:', {
      ordersCount: formattedResponse.orders.length,
      revenueTotal: formattedResponse.revenue.total,
      popularItemsCount: formattedResponse.popularItems.length,
      uniqueCustomers: formattedResponse.customerStats.uniqueCustomers
    });

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error('Erreur récupération analytics partenaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
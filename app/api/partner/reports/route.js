import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import json2csv from 'json2csv';

export const dynamic = 'force-dynamic';

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
    const reportType = searchParams.get('type') || 'monthly';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Récupérer le restaurant du partenaire
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('partner_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Définir les dates selon le type de rapport
    let queryStartDate, queryEndDate;
    const now = new Date();

    switch (reportType) {
      case 'weekly':
        queryStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        queryEndDate = now;
        break;
      case 'monthly':
        queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        queryEndDate = now;
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        queryStartDate = new Date(now.getFullYear(), quarter * 3, 1);
        queryEndDate = now;
        break;
      case 'yearly':
        queryStartDate = new Date(now.getFullYear(), 0, 1);
        queryEndDate = now;
        break;
      case 'custom':
        if (!startDate || !endDate) {
          return NextResponse.json({ error: 'Dates de début et fin requises pour le rapport personnalisé' }, { status: 400 });
        }
        queryStartDate = new Date(startDate);
        queryEndDate = new Date(endDate);
        break;
      default:
        queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        queryEndDate = now;
    }

    // Récupérer les commandes pour la période
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
      .gte('created_at', queryStartDate.toISOString())
      .lte('created_at', queryEndDate.toISOString())
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    // Calculer les statistiques du rapport
    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0;
    const commissionEarned = totalRevenue * (restaurant.commission_rate / 100);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Commandes livrées vs annulées
    const deliveredOrders = orders?.filter(order => order.statut === 'livree').length || 0;
    const cancelledOrders = orders?.filter(order => order.statut === 'annulee').length || 0;
    const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    // Analyse des produits
    const productAnalysis = {};
    orders?.forEach(order => {
      order.order_items?.forEach(item => {
        const menuId = item.menu_id;
        if (!productAnalysis[menuId]) {
          productAnalysis[menuId] = {
            name: item.menu?.nom || 'Inconnu',
            category: item.menu?.category || 'Non catégorisé',
            quantity: 0,
            revenue: 0,
            orders: 0
          };
        }
        productAnalysis[menuId].quantity += item.quantity;
        productAnalysis[menuId].revenue += parseFloat(item.total_price);
        productAnalysis[menuId].orders += 1;
      });
    });

    const topProducts = Object.values(productAnalysis)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Analyse par catégorie
    const categoryAnalysis = {};
    Object.values(productAnalysis).forEach(product => {
      const category = product.category;
      if (!categoryAnalysis[category]) {
        categoryAnalysis[category] = {
          revenue: 0,
          orders: 0,
          products: 0
        };
      }
      categoryAnalysis[category].revenue += product.revenue;
      categoryAnalysis[category].orders += product.orders;
      categoryAnalysis[category].products += 1;
    });

    // Tendances temporelles
    const timeAnalysis = orders?.reduce((acc, order) => {
      const date = new Date(order.created_at);
      const dayOfWeek = date.toLocaleDateString('fr-FR', { weekday: 'long' });
      const hour = date.getHours();
      
      if (!acc.days[dayOfWeek]) {
        acc.days[dayOfWeek] = { orders: 0, revenue: 0 };
      }
      if (!acc.hours[hour]) {
        acc.hours[hour] = { orders: 0, revenue: 0 };
      }
      
      acc.days[dayOfWeek].orders += 1;
      acc.days[dayOfWeek].revenue += parseFloat(order.total_amount);
      acc.hours[hour].orders += 1;
      acc.hours[hour].revenue += parseFloat(order.total_amount);
      
      return acc;
    }, { days: {}, hours: {} }) || { days: {}, hours: {} };

    const dayTrends = Object.entries(timeAnalysis.days)
      .map(([day, stats]) => ({
        day,
        orders: stats.orders,
        revenue: Math.round(stats.revenue * 100) / 100
      }))
      .sort((a, b) => b.orders - a.orders);

    const hourTrends = Object.entries(timeAnalysis.hours)
      .map(([hour, stats]) => ({
        hour: parseInt(hour),
        orders: stats.orders,
        revenue: Math.round(stats.revenue * 100) / 100
      }))
      .sort((a, b) => a.hour - b.hour);

    return NextResponse.json({
      reportInfo: {
        type: reportType,
        startDate: queryStartDate.toISOString(),
        endDate: queryEndDate.toISOString(),
        generatedAt: new Date().toISOString()
      },
      restaurant: {
        id: restaurant.id,
        nom: restaurant.nom,
        commission_rate: restaurant.commission_rate
      },
      summary: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        commissionEarned: Math.round(commissionEarned * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        deliveredOrders,
        cancelledOrders,
        deliveryRate: Math.round(deliveryRate * 100) / 100
      },
      productAnalysis: {
        topProducts,
        categoryAnalysis
      },
      trends: {
        dayTrends,
        hourTrends
      },
      orders: orders?.slice(0, 50) || [] // Limiter à 50 commandes pour le rapport
    });
  } catch (error) {
    console.error('Erreur génération rapport:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

async function generateOrdersReport(restaurantId, startDate) {
  const { data: orders, error } = await supabase
    .from('commandes')
    .select(`
      *,
      users(nom, prenom, email),
      commande_details(
        quantite,
        prix_unitaire,
        menus(nom, category)
      )
    `)
    .eq('restaurant_id', restaurantId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  const report = {
    type: 'orders',
    period: {
      start: startDate.toISOString(),
      end: new Date().toISOString()
    },
    summary: {
      totalOrders: orders?.length || 0,
      totalRevenue: orders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0,
      averageOrderValue: orders?.length > 0 ? 
        orders.reduce((sum, order) => sum + parseFloat(order.total), 0) / orders.length : 0,
      statusBreakdown: {
        en_attente: orders?.filter(o => o.statut === 'en_attente').length || 0,
        en_preparation: orders?.filter(o => o.statut === 'en_preparation').length || 0,
        en_livraison: orders?.filter(o => o.statut === 'en_livraison').length || 0,
        livree: orders?.filter(o => o.statut === 'livree').length || 0,
        annulee: orders?.filter(o => o.statut === 'annulee').length || 0
      }
    },
    orders: orders || []
  };

  return report;
}

async function generateRevenueReport(restaurantId, startDate) {
  const { data: orders, error } = await supabase
    .from('commandes')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('statut', 'livree')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Grouper par jour
  const dailyRevenue = {};
  orders?.forEach(order => {
    const date = new Date(order.created_at).toLocaleDateString('fr-FR');
    if (!dailyRevenue[date]) {
      dailyRevenue[date] = { revenue: 0, orders: 0 };
    }
    dailyRevenue[date].revenue += parseFloat(order.total);
    dailyRevenue[date].orders += 1;
  });

  const report = {
    type: 'revenue',
    period: {
      start: startDate.toISOString(),
      end: new Date().toISOString()
    },
    summary: {
      totalRevenue: orders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0,
      totalOrders: orders?.length || 0,
      averageDailyRevenue: Object.values(dailyRevenue).reduce((sum, day) => sum + day.revenue, 0) / 
        Math.max(Object.keys(dailyRevenue).length, 1)
    },
    dailyRevenue: Object.entries(dailyRevenue).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders
    }))
  };

  return report;
}

async function generateMenuReport(restaurantId, startDate) {
  const { data: menuItems, error: menuError } = await supabase
    .from('menus')
    .select('*')
    .eq('restaurant_id', restaurantId);

  if (menuError) throw menuError;

  const { data: orderDetails, error: detailsError } = await supabase
    .from('commande_details')
    .select(`
      quantite,
      prix_unitaire,
      menus(id, nom, category),
      commandes(created_at)
    `)
    .in('menus.id', menuItems?.map(item => item.id) || [])
    .gte('commandes.created_at', startDate.toISOString());

  if (detailsError) throw detailsError;

  // Analyser les performances des plats
  const menuPerformance = {};
  menuItems?.forEach(item => {
    const itemOrders = orderDetails?.filter(detail => detail.menus?.id === item.id) || [];
    const totalQuantity = itemOrders.reduce((sum, detail) => sum + detail.quantite, 0);
    const totalRevenue = itemOrders.reduce((sum, detail) => sum + (detail.quantite * detail.prix_unitaire), 0);

    menuPerformance[item.id] = {
      id: item.id,
      nom: item.nom,
      category: item.category,
      prix: item.prix,
      disponible: item.disponible,
      totalCommandes: itemOrders.length,
      totalQuantite: totalQuantity,
      totalRevenue: totalRevenue,
      moyenneParCommande: itemOrders.length > 0 ? totalQuantity / itemOrders.length : 0
    };
  });

  const report = {
    type: 'menu',
    period: {
      start: startDate.toISOString(),
      end: new Date().toISOString()
    },
    summary: {
      totalItems: menuItems?.length || 0,
      availableItems: menuItems?.filter(item => item.disponible).length || 0,
      totalRevenue: Object.values(menuPerformance).reduce((sum, item) => sum + item.totalRevenue, 0),
      mostPopularItem: Object.values(menuPerformance)
        .sort((a, b) => b.totalQuantite - a.totalQuantite)[0] || null
    },
    menuPerformance: Object.values(menuPerformance)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
  };

  return report;
}

function generateCSVResponse(data, filename) {
  let csv = '';
  
  if (data.type === 'orders') {
    csv = 'ID,Date,Client,Total,Statut,Articles\n';
    data.orders.forEach(order => {
      const articles = order.commande_details?.map(d => `${d.quantite}x ${d.menus?.nom}`).join('; ') || '';
      csv += `${order.id},${new Date(order.created_at).toLocaleString('fr-FR')},${order.users?.nom} ${order.users?.prenom},${order.total}€,${order.statut},"${articles}"\n`;
    });
  } else if (data.type === 'revenue') {
    csv = 'Date,Revenus,Commandes\n';
    data.dailyRevenue.forEach(day => {
      csv += `${day.date},${day.revenue}€,${day.orders}\n`;
    });
  } else if (data.type === 'menu') {
    csv = 'Plat,Catégorie,Prix,Disponible,Commandes,Quantité,Revenus\n';
    data.menuPerformance.forEach(item => {
      csv += `"${item.nom}","${item.category || ''}",${item.prix}€,${item.disponible ? 'Oui' : 'Non'},${item.totalCommandes},${item.totalQuantite},${item.totalRevenue}€\n`;
    });
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
      'Access-Control-Allow-Origin': '*'
    }
  });
} 
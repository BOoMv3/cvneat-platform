import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import json2csv from 'json2csv';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const type = searchParams.get('type') || 'orders'; // orders, revenue, menu
    const period = searchParams.get('period') || 'month'; // week, month, year
    const format = searchParams.get('format') || 'json'; // json, csv

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
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let reportData;

    switch (type) {
      case 'orders':
        reportData = await generateOrdersReport(restaurantId, startDate);
        break;
      case 'revenue':
        reportData = await generateRevenueReport(restaurantId, startDate);
        break;
      case 'menu':
        reportData = await generateMenuReport(restaurantId, startDate);
        break;
      default:
        return NextResponse.json({ error: 'Type de rapport invalide' }, { status: 400 });
    }

    if (format === 'csv') {
      return generateCSVResponse(reportData, `${type}_report_${period}`);
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Erreur génération rapport:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport' },
      { status: 500 }
    );
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
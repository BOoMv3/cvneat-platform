import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID requis' }, { status: 400 });
    }

    // Récupérer les statistiques du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Commandes du jour
    const { data: todayOrders, error: todayError } = await supabase
      .from('commandes')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    if (todayError) throw todayError;

    // Commandes en attente
    const { data: pendingOrders, error: pendingError } = await supabase
      .from('commandes')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('statut', ['en_attente', 'en_preparation']);

    if (pendingError) throw pendingError;

    // Revenus du jour
    const { data: todayRevenue, error: revenueError } = await supabase
      .from('commandes')
      .select('total')
      .eq('restaurant_id', restaurantId)
      .eq('statut', 'livree')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    if (revenueError) throw revenueError;

    const totalRevenue = todayRevenue?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0;

    // Dernières commandes
    const { data: recentOrders, error: recentError } = await supabase
      .from('commandes')
      .select(`
        *,
        users(nom, prenom, email),
        commande_details(
          quantite,
          prix_unitaire,
          menus(nom)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    const stats = {
      todayOrders: todayOrders?.length || 0,
      pendingOrders: pendingOrders?.length || 0,
      totalRevenue: totalRevenue.toFixed(2),
      recentOrders: recentOrders || []
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erreur dashboard partenaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
} 
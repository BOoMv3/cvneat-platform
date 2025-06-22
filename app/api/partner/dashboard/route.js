import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

async function getUserFromRequest(request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;
  
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return { ...user, role: userData?.role };
}

export async function GET(request) {
  const user = await getUserFromRequest(request);

  if (!user || user.role !== 'partner') {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  try {
    // Récupérer l'ID du restaurant associé à l'utilisateur partenaire
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurantData) {
      return NextResponse.json({ error: 'Restaurant non trouvé pour ce partenaire' }, { status: 404 });
    }

    const restaurantId = restaurantData.id;

    // Calculer les statistiques
    const today = new Date().toISOString().slice(0, 10); // Format YYYY-MM-DD

    const { count: today_orders, error: todayOrdersError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', `${today}T00:00:00.000Z`);

    const { count: pending_orders, error: pendingOrdersError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'accepted', 'preparing']);

    const { data: revenueData, error: revenueError } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'delivered');
      
    if (todayOrdersError || pendingOrdersError || revenueError) {
        console.error({todayOrdersError, pendingOrdersError, revenueError});
        return NextResponse.json({ error: 'Erreur lors du calcul des statistiques' }, { status: 500 });
    }

    const total_revenue = revenueData ? revenueData.reduce((sum, order) => sum + order.total_amount, 0) : 0;

    return NextResponse.json({
      today_orders: today_orders || 0,
      pending_orders: pending_orders || 0,
      total_revenue: total_revenue || 0,
    });

  } catch (error) {
    console.error('Erreur API (dashboard partner):', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
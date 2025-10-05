import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

async function getUserFromRequest(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return null;
    
    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Vérifier le rôle dans la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) return null;

    return { ...user, role: userData.role };
  } catch (error) {
    console.error('Erreur authentification:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    if (user.role !== 'restaurant') {
      return NextResponse.json({ error: 'Accès non autorisé - Rôle restaurant requis' }, { status: 403 });
    }

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
      .from('commandes')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', `${today}T00:00:00.000Z`);

    const { count: pending_orders, error: pendingOrdersError } = await supabase
      .from('commandes')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .in('statut', ['en_attente', 'en_preparation']);

    const { data: revenueData, error: revenueError } = await supabase
      .from('commandes')
      .select('total')
      .eq('restaurant_id', restaurantId)
      .eq('statut', 'livree');
      
    if (todayOrdersError || pendingOrdersError || revenueError) {
        console.error({todayOrdersError, pendingOrdersError, revenueError});
        return NextResponse.json({ error: 'Erreur lors du calcul des statistiques' }, { status: 500 });
    }

    const total_revenue = revenueData ? revenueData.reduce((sum, order) => sum + (order.total || 0), 0) : 0;

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
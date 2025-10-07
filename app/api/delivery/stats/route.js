import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    console.log('🔍 API stats appelée');
    
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    // Token vérifié (non loggé pour des raisons de sécurité)
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      console.log('❌ Pas d\'utilisateur connecté');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // Vérifier que l'utilisateur est un livreur (par email)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      console.log('❌ Rôle incorrect:', userData?.role, 'pour email:', user.email);
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    console.log('✅ Rôle livreur confirmé');

    // Calculer les statistiques en temps réel à partir des commandes
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Récupérer toutes les commandes avec le statut 'delivered' pour ce livreur
    const { data: orders, error: ordersError } = await supabase
      .from('commandes')
      .select('*')
      .eq('status', 'delivered')
      .eq('delivery_id', user.id);

    if (ordersError) {
      console.error('Erreur récupération commandes:', ordersError);
      return NextResponse.json({ error: "Erreur récupération commandes" }, { status: 500 });
    }

    console.log('📦 Commandes trouvées:', orders?.length || 0);
    console.log('📦 Détails commandes:', orders?.map(o => ({ id: o.id, status: o.status, delivery_fee: o.delivery_fee, total_amount: o.total_amount })));
    
    // Debug: vérifier toutes les commandes
    const { data: allOrders, error: allOrdersError } = await supabase
      .from('commandes')
      .select('id, status, delivery_fee, total_amount');
    
    console.log('🔍 Toutes les commandes:', allOrders);

    // Calculer les statistiques
    const totalDeliveries = orders?.length || 0;
    const totalEarnings = orders?.reduce((sum, order) => sum + (order.delivery_fee || 0), 0) || 0;
    
    // Commandes d'aujourd'hui
    const todayOrders = orders?.filter(order => {
      const orderDate = new Date(order.updated_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    }) || [];
    
    const todayDeliveries = todayOrders.length;
    
    // Calculer le temps moyen de livraison (fixe pour la démo)
    const averageDeliveryTime = totalDeliveries > 0 ? 25 : 0; // 25 min fixe
    
    // Note moyenne (fixe pour la démo)
    const averageRating = totalDeliveries > 0 ? 4.5 : 0; // 4.5 fixe

    const stats = {
      total_earnings: totalEarnings,
      total_deliveries: totalDeliveries,
      today_deliveries: todayDeliveries,
      completed_deliveries: totalDeliveries,
      average_delivery_time: averageDeliveryTime,
      average_rating: averageRating,
      last_month_earnings: totalEarnings, // Simplification
      total_distance_km: totalDeliveries * 5, // Estimation 5km par livraison
      total_time_hours: totalDeliveries * 0.5 // Estimation 30min par livraison
    };

    console.log('📊 Stats calculées:', stats);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erreur API stats livreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
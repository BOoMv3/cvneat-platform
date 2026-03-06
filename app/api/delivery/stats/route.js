import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

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

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier que l'utilisateur est un livreur (par ID pour plus de fiabilité)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      console.log('❌ Rôle incorrect:', userData?.role, 'pour ID:', user.id);
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    console.log('✅ Rôle livreur confirmé');

    // Calculer les statistiques en temps réel à partir des commandes
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Récupérer toutes les commandes avec le statut 'livree' pour ce livreur
    // Exclure les commandes déjà payées (livreur_paid_at IS NULL)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('statut', 'livree')
      .eq('livreur_id', user.id)
      .is('livreur_paid_at', null); // Seulement les commandes non payées

    if (ordersError) {
      console.error('Erreur récupération commandes:', ordersError);
      return NextResponse.json({ error: "Erreur récupération commandes" }, { status: 500 });
    }

    console.log('📦 Commandes trouvées:', orders?.length || 0);
    console.log('📦 Détails commandes:', orders?.map(o => ({ id: o.id, statut: o.statut, frais_livraison: o.frais_livraison, total: o.total })));
    
    // Debug: vérifier toutes les commandes
    const { data: allOrders, error: allOrdersError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, frais_livraison, total');
    
    console.log('🔍 Toutes les commandes:', allOrders);

    // Calculer les statistiques
    // IMPORTANT: Utiliser frais_livraison - delivery_commission_cvneat pour calculer les gains réels du livreur
    const totalDeliveries = orders?.length || 0;
    const totalEarnings = orders?.reduce((sum, order) => {
      const fraisLivraison = parseFloat(order.frais_livraison || 0);
      const commission = parseFloat(order.delivery_commission_cvneat || 0);
      const livreurEarning = fraisLivraison - commission; // Gain réel du livreur
      return sum + livreurEarning;
    }, 0) || 0;
    
    // Commandes d'aujourd'hui
    const todayOrders = orders?.filter(order => {
      const orderDate = new Date(order.updated_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    }) || [];
    
    const todayDeliveries = todayOrders.length;
    
    // Calculer le temps moyen de livraison (estimation)
    const averageDeliveryTime = totalDeliveries > 0 ? 25 : 0;
    
    // Note moyenne depuis delivery_ratings
    let averageRating = 0;
    const { data: ratings } = await supabaseAdmin
      .from('delivery_ratings')
      .select('rating')
      .eq('livreur_id', user.id);
    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((s, r) => s + (r.rating || 0), 0);
      averageRating = Math.round((sum / ratings.length) * 10) / 10;
    }

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
    const res = NextResponse.json(stats);
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error) {
    console.error('Erreur API stats livreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    
    // Récupérer le token depuis les headers ou cookies (priorité au header)
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.replace('Bearer ', '')?.trim();
    if (!token && request.cookies) {
      const sbToken = request.cookies.get?.('sb-access-token');
      if (sbToken?.value) token = sbToken.value;
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }


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

    const role = (userData?.role || '').toString().trim().toLowerCase();
    if (userError || !userData || (role !== 'delivery' && role !== 'livreur')) {
      console.log('❌ Rôle incorrect:', userData?.role, 'pour ID:', user.id);
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }


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

    // Récupérer aussi le total historique (toutes les livrées, payées ou non) pour cohérence affichage
    const { data: allDelivered } = await supabaseAdmin
      .from('commandes')
      .select('frais_livraison, delivery_commission_cvneat')
      .eq('statut', 'livree')
      .eq('livreur_id', user.id);

    const totalEarningsAll = (allDelivered || []).reduce((sum, o) => {
      const f = parseFloat(o.frais_livraison || 0);
      const c = parseFloat(o.delivery_commission_cvneat || 0);
      return sum + (f - c);
    }, 0);
    const totalDeliveriesAll = allDelivered?.length || 0;

    const stats = {
      total_earnings: totalEarnings,
      total_deliveries: totalDeliveries,
      total_earnings_all: totalEarningsAll,
      total_deliveries_all: totalDeliveriesAll,
      today_deliveries: todayDeliveries,
      completed_deliveries: totalDeliveries,
      average_delivery_time: totalDeliveries > 0 ? 25 : 0,
      average_rating: averageRating,
      last_month_earnings: totalEarnings,
      total_distance_km: totalDeliveries * 5,
      total_time_hours: totalDeliveries * 0.5
    };

    const res = NextResponse.json(stats);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (error) {
    console.error('Erreur API stats livreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
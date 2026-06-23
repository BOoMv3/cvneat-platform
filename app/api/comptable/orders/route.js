import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireFinanceAccess } from '../../../../lib/require-finance-access';
import { computeCvneatNetRevenueEur } from '../../../../lib/cvneat-order-revenue';
import { livreurEarningNetEur } from '../../../../lib/livreur-delivery-earnings';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const auth = await requireFinanceAccess(request, supabaseAdmin);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const restaurantId = searchParams.get('restaurantId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10) || 500, 2000);

    let query = supabaseAdmin
      .from('commandes')
      .select(
        'id, created_at, statut, payment_status, total, discount_amount, frais_livraison, commission_amount, commission_rate, restaurant_payout, delivery_commission_cvneat, platform_discount_amount, loyalty_article_subsidy_eur, restaurant_id, restaurant_paid_at, livreur_paid_at, stripe_payment_intent_id, stripe_refund_id, refund_amount'
      )
      .eq('statut', 'livree')
      .in('payment_status', ['paid', 'succeeded', 'refunded'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (from) query = query.gte('created_at', new Date(from).toISOString());
    if (to) query = query.lte('created_at', new Date(`${to}T23:59:59.999Z`).toISOString());
    if (restaurantId) query = query.eq('restaurant_id', restaurantId);

    const [{ data: orders, error }, { data: restaurants }] = await Promise.all([
      query,
      supabaseAdmin.from('restaurants').select('id, nom, siret, legal_name, commission_rate'),
    ]);

    if (error) throw error;

    const restaurantById = Object.fromEntries((restaurants || []).map((r) => [r.id, r]));

    const rows = (orders || []).map((o) => {
      const restaurant = restaurantById[o.restaurant_id];
      const cvneat = computeCvneatNetRevenueEur(o, { restaurant });
      const articles = Math.max(0, parseFloat(o.total || 0) - parseFloat(o.discount_amount || 0));
      return {
        id: o.id,
        shortId: (o.id || '').slice(0, 8),
        created_at: o.created_at,
        restaurant_id: o.restaurant_id,
        restaurant_name: restaurant?.nom || '—',
        restaurant_siret: restaurant?.siret || null,
        payment_status: o.payment_status,
        total_ttc: parseFloat(o.total || 0) + parseFloat(o.frais_livraison || 0),
        articles_ht: articles,
        discount_amount: parseFloat(o.discount_amount || 0) || 0,
        frais_livraison: parseFloat(o.frais_livraison || 0) || 0,
        commission_amount: parseFloat(o.commission_amount || 0) || cvneat.commission,
        restaurant_payout: parseFloat(o.restaurant_payout || 0) || null,
        delivery_commission_cvneat: parseFloat(o.delivery_commission_cvneat || 0) || 0,
        platform_discount_amount: cvneat.platformDiscount,
        loyalty_subsidy: cvneat.loyaltySubsidy,
        cvneat_net: cvneat.net,
        livreur_net: livreurEarningNetEur(o),
        restaurant_paid_at: o.restaurant_paid_at,
        livreur_paid_at: o.livreur_paid_at,
        stripe_payment_intent_id: o.stripe_payment_intent_id,
        stripe_refund_id: o.stripe_refund_id,
        refund_amount: o.refund_amount,
      };
    });

    return NextResponse.json({ orders: rows, count: rows.length });
  } catch (error) {
    console.error('comptable/orders:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

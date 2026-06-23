import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireFinanceAccess } from '../../../../lib/require-finance-access';
import { aggregateCvneatRevenue } from '../../../../lib/cvneat-order-revenue';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export async function GET(request) {
  try {
    const auth = await requireFinanceAccess(request, supabaseAdmin);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [{ data: restaurantTransfers }, { data: deliveryTransfers }, { data: orders }, { data: restaurants }] =
      await Promise.all([
        supabaseAdmin
          .from('restaurant_transfers')
          .select('id, amount, transfer_date, status, invoice_number')
          .eq('status', 'completed')
          .order('transfer_date', { ascending: false }),
        supabaseAdmin
          .from('delivery_transfers')
          .select('id, amount, transfer_date, status')
          .eq('status', 'completed')
          .order('transfer_date', { ascending: false }),
        supabaseAdmin
          .from('commandes')
          .select(
            'id, statut, payment_status, total, discount_amount, commission_amount, restaurant_payout, frais_livraison, delivery_commission_cvneat, platform_discount_amount, loyalty_article_subsidy_eur, created_at, restaurant_id'
          )
          .eq('statut', 'livree')
          .in('payment_status', ['paid', 'succeeded']),
        supabaseAdmin.from('restaurants').select('id, nom, siret, legal_name, vat_number'),
      ]);

    const delivered = orders || [];
    const { totals: cvneatTotals } = aggregateCvneatRevenue(delivered, restaurants || []);

    const restaurantTransferred = round2(
      (restaurantTransfers || []).reduce((s, t) => s + parseFloat(t.amount || 0), 0)
    );
    const deliveryTransferred = round2(
      (deliveryTransfers || []).reduce((s, t) => s + parseFloat(t.amount || 0), 0)
    );

    const caCommandes = round2(
      delivered.reduce((s, o) => s + parseFloat(o.total || 0) + parseFloat(o.frais_livraison || 0), 0)
    );

    return NextResponse.json({
      summary: {
        restaurantTransfersCount: (restaurantTransfers || []).length,
        restaurantTransferredTotal: restaurantTransferred,
        deliveryTransfersCount: (deliveryTransfers || []).length,
        deliveryTransferredTotal: deliveryTransferred,
        deliveredOrdersCount: delivered.length,
        ordersRevenueTotal: caCommandes,
        cvneatNetRevenue: cvneatTotals.net,
        cvneatGrossRevenue: cvneatTotals.gross,
        cvneatCommissionTotal: cvneatTotals.commission,
        cvneatPlatformFeesTotal: cvneatTotals.platformFees,
        cvneatDeliveryCommissionTotal: cvneatTotals.deliveryCommission,
        cvneatPlatformPromoCost: cvneatTotals.platformPromoCost,
        cvneatLoyaltySubsidyTotal: cvneatTotals.loyaltySubsidy,
        partnersWithSiret: (restaurants || []).filter((r) => r.siret).length,
        partnersTotal: (restaurants || []).length,
      },
      recentRestaurantTransfers: (restaurantTransfers || []).slice(0, 8),
      recentDeliveryTransfers: (deliveryTransfers || []).slice(0, 8),
    });
  } catch (error) {
    console.error('comptable/dashboard:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

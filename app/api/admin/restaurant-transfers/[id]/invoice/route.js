import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getFixedCommissionRatePercentFromName, getEffectiveCommissionRatePercent, computeCommissionAndPayout } from '../../../../../../lib/commission';
import { buildRestaurantTransferInvoiceHtml } from '../../../../../../lib/restaurant-invoice';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAdminUser(request) {
  const authHeader = request.headers.get('authorization');
  const token =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

  if (!token) return { ok: false, status: 401, error: 'Token requis' };

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  const user = userRes?.user;
  if (userErr || !user) return { ok: false, status: 401, error: 'Token invalide' };

  const { data: userData, error: roleErr } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (roleErr || !userData || userData.role !== 'admin') {
    return { ok: false, status: 403, error: 'Accès admin requis' };
  }

  return { ok: true, user };
}

export async function GET(request, { params }) {
  const auth = await requireAdminUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const { data: transfer, error: transferErr } = await supabaseAdmin
    .from('restaurant_transfers')
    .select('*')
    .eq('id', id)
    .single();
  if (transferErr || !transfer) {
    return NextResponse.json({ error: 'Virement introuvable' }, { status: 404 });
  }

  const { data: restaurant, error: restErr } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom, legal_name, siret, vat_number, adresse, code_postal, ville, email, commission_rate')
    .eq('id', transfer.restaurant_id)
    .single();
  if (restErr || !restaurant) {
    return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 });
  }

  let ordersQuery = supabaseAdmin
    .from('commandes')
    .select('id, created_at, total, payment_status, commission_rate, commission_amount, restaurant_payout')
    .eq('restaurant_id', transfer.restaurant_id)
    .eq('statut', 'livree')
    .order('created_at', { ascending: true });

  if (transfer.period_start && transfer.period_end) {
    ordersQuery = ordersQuery
      .gte('created_at', new Date(transfer.period_start).toISOString())
      .lte('created_at', new Date(new Date(transfer.period_end).setHours(23, 59, 59, 999)).toISOString());
  } else {
    const start = new Date(transfer.transfer_date);
    start.setDate(start.getDate() - 60);
    const end = new Date(transfer.transfer_date);
    end.setDate(end.getDate() + 1);
    ordersQuery = ordersQuery
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
  }

  const { data: ordersRaw, error: ordersErr } = await ordersQuery;
  if (ordersErr) {
    return NextResponse.json({ error: 'Erreur chargement commandes' }, { status: 500 });
  }

  const paidOrders = (ordersRaw || []).filter((o) => {
    const s = (o.payment_status || '').toString().trim().toLowerCase();
    return !['failed', 'cancelled', 'refunded'].includes(s);
  });

  let orders = paidOrders;
  const fixedRatePercent = getFixedCommissionRatePercentFromName(restaurant.nom);
  const restRate = restaurant.commission_rate ?? 20;

  if (!transfer.period_start || !transfer.period_end) {
    const targetAmount = parseFloat(transfer.amount || 0);
    let sum = 0;
    orders = [];
    for (const o of paidOrders) {
      const ratePercent = getEffectiveCommissionRatePercent({
        restaurantName: restaurant.nom,
        orderRatePercent: o.commission_rate,
        restaurantRatePercent: restRate,
      });
      const computed = computeCommissionAndPayout(Number(o.total || 0), ratePercent);
      const payout = fixedRatePercent !== null ? computed.payout : (o.restaurant_payout ?? computed.payout);
      if (sum + payout <= targetAmount + 0.02) {
        orders.push(o);
        sum += payout;
      } else {
        break;
      }
    }
  }

  const totals = orders.reduce(
    (acc, o) => {
      const ratePercent = getEffectiveCommissionRatePercent({
        restaurantName: restaurant.nom,
        orderRatePercent: o.commission_rate,
        restaurantRatePercent: restRate,
      });
      const computed = computeCommissionAndPayout(Number(o.total || 0), ratePercent);
      const commission = fixedRatePercent !== null ? computed.commission : (o.commission_amount ?? computed.commission);
      const payout = fixedRatePercent !== null ? computed.payout : (o.restaurant_payout ?? computed.payout);
      acc.totalRevenue += Number(o.total || 0);
      acc.totalCommission += commission;
      acc.totalPayoutDue += payout;
      return acc;
    },
    { totalRevenue: 0, totalCommission: 0, totalPayoutDue: 0 }
  );

  const invoiceNumber = transfer.invoice_number || `FAC-${new Date(transfer.transfer_date).getFullYear()}-${(transfer.id || '').slice(0, 6).toUpperCase()}`;

  const transferForInvoice = { ...transfer };
  if (!transfer.period_start && !transfer.period_end && orders.length > 0) {
    const first = new Date(orders[0].created_at);
    const last = new Date(orders[orders.length - 1].created_at);
    transferForInvoice.periodComputed = `${first.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} au ${last.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  }

  const html = buildRestaurantTransferInvoiceHtml({
    restaurant,
    transfer: transferForInvoice,
    orders,
    totals,
    invoiceNumber,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

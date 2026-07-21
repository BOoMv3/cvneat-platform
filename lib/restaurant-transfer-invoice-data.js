import { buildRestaurantTransferInvoiceHtml } from './restaurant-invoice.js';
import {
  alignOrdersPayoutToTransferAmount,
  computeTransferOrderTotals,
  periodFromOrders,
  selectOrdersForTransferAmount,
  toParisDateString,
} from './restaurant-transfer-orders.js';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function sumPayouts(orders, restaurant) {
  const totals = computeTransferOrderTotals(orders, restaurant);
  return round2(totals.totalPayoutDue);
}

/**
 * Reconstruct invoice line items for a restaurant transfer.
 * Priority:
 * 1) Orders marked paid near this transfer (restaurant_paid_at ≈ created_at)
 * 2) Orders in transfer.period_start → period_end
 * 3) Legacy chronological reconstruction (last resort)
 */
export async function loadRestaurantTransferInvoiceData(supabaseAdmin, transferId) {
  const { data: transfer, error: transferErr } = await supabaseAdmin
    .from('restaurant_transfers')
    .select('*')
    .eq('id', transferId)
    .single();
  if (transferErr || !transfer) {
    return { error: 'Virement introuvable', status: 404 };
  }

  const { data: restaurant, error: restErr } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom, legal_name, siret, vat_number, adresse, code_postal, ville, email, commission_rate')
    .eq('id', transfer.restaurant_id)
    .single();
  if (restErr || !restaurant) {
    return { error: 'Restaurant introuvable', status: 404 };
  }

  const { data: ordersRaw, error: ordersErr } = await supabaseAdmin
    .from('commandes')
    .select(
      'id, created_at, total, discount_amount, payment_status, commission_rate, commission_amount, restaurant_payout, loyalty_article_subsidy_eur, restaurant_paid_at'
    )
    .eq('restaurant_id', transfer.restaurant_id)
    .eq('statut', 'livree')
    .order('created_at', { ascending: true });

  if (ordersErr) {
    return { error: 'Erreur chargement commandes', status: 500 };
  }

  const paidOrders = (ordersRaw || [])
    .filter((o) => {
      const s = (o.payment_status || '').toString().trim().toLowerCase();
      return !['failed', 'cancelled', 'refunded'].includes(s);
    })
    .map((o) => ({ ...o, _restaurant: restaurant }));

  const target = parseFloat(transfer.amount || 0);
  let orders = [];
  let selectionMode = 'none';

  // 1) Commandes marquées payées au moment de CE virement
  const anchorIso = transfer.invoice_generated_at || transfer.created_at;
  if (anchorIso) {
    const anchorMs = new Date(anchorIso).getTime();
    const windowMs = 15 * 60 * 1000; // 15 min (create + mark + archive)
    const nearPaid = paidOrders.filter((o) => {
      if (!o.restaurant_paid_at) return false;
      const t = new Date(o.restaurant_paid_at).getTime();
      return Number.isFinite(t) && Math.abs(t - anchorMs) <= windowMs;
    });
    if (nearPaid.length > 0) {
      const delta = Math.abs(sumPayouts(nearPaid, restaurant) - target);
      // Accepter même si léger écart (arrondi / override) — c’est le lien le plus fiable
      if (delta <= 25 || nearPaid.length >= 1) {
        orders = nearPaid;
        selectionMode = 'paid_at_window';
      }
    }
  }

  // 2) Période stockée sur le virement (créée au moment du paiement dashboard)
  if (orders.length === 0 && transfer.period_start && transfer.period_end) {
    const inPeriod = paidOrders.filter((o) => {
      const d = toParisDateString(o.created_at);
      return d >= transfer.period_start && d <= transfer.period_end;
    });
    // Préférer celles déjà marquées payées (évite de re-lister des commandes non couvertes)
    const paidInPeriod = inPeriod.filter((o) => o.restaurant_paid_at);
    const candidates = paidInPeriod.length ? paidInPeriod : inPeriod;
    if (candidates.length > 0) {
      orders = candidates;
      selectionMode = 'period';
    }
  }

  // 3) Fallback legacy : consommer les virements antérieurs puis préfixe au montant
  if (orders.length === 0) {
    const { data: priorTransfers } = await supabaseAdmin
      .from('restaurant_transfers')
      .select('id, amount, transfer_date, created_at, period_start, period_end')
      .eq('restaurant_id', transfer.restaurant_id)
      .eq('status', 'completed')
      .order('transfer_date', { ascending: true })
      .order('created_at', { ascending: true });

    const priors = (priorTransfers || []).filter((t) => t.id !== transfer.id);

    let startIdx = 0;
    for (const t of priors) {
      const { nextIdx } = selectOrdersForTransferAmount(paidOrders, startIdx, t.amount);
      startIdx = nextIdx;
    }

    let selected = selectOrdersForTransferAmount(paidOrders, startIdx, transfer.amount);
    let bestDelta = Math.abs(round2(selected.sum) - target);

    const lastPrior = priors[priors.length - 1];
    if (lastPrior && bestDelta > 1) {
      const excludedPeriods = priors
        .filter((t) => t.period_start && t.period_end)
        .map((t) => ({ start: t.period_start, end: t.period_end }));

      const transferDate = (transfer.transfer_date || '').slice(0, 10);
      const cutoff = transferDate >= '2026-06-01' ? '2026-05-31' : transferDate;

      const pool = paidOrders.filter((o) => {
        const d = toParisDateString(o.created_at);
        if (d > cutoff) return false;
        return !excludedPeriods.some((p) => d >= p.start && d <= p.end);
      });

      if (pool.length) {
        const alt = selectOrdersForTransferAmount(pool, 0, transfer.amount);
        const altDelta = Math.abs(round2(alt.sum) - target);
        if (altDelta < bestDelta) {
          selected = alt;
          bestDelta = altDelta;
        }
      }
    }

    orders = selected.orders;
    selectionMode = 'legacy_prefix';
  }

  orders = alignOrdersPayoutToTransferAmount(orders, restaurant, transfer.amount);

  const period = periodFromOrders(orders);
  // Ne jamais écraser une période déjà enregistrée au paiement
  const transferForInvoice = {
    ...transfer,
    period_start: transfer.period_start || period.period_start,
    period_end: transfer.period_end || period.period_end,
  };

  const totals = computeTransferOrderTotals(orders, restaurant);
  const invoiceNumber =
    transfer.invoice_number ||
    `FAC-${new Date(transfer.transfer_date).getFullYear()}-${(transfer.id || '').slice(0, 6).toUpperCase()}`;

  const html = buildRestaurantTransferInvoiceHtml({
    restaurant,
    transfer: transferForInvoice,
    orders,
    totals,
    invoiceNumber,
  });

  return {
    transfer: transferForInvoice,
    restaurant,
    orders,
    totals,
    invoiceNumber,
    html,
    selectionMode,
  };
}

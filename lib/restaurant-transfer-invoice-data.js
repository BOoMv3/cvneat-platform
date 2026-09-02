import { buildRestaurantTransferInvoiceHtml } from './restaurant-invoice.js';
import {
  alignOrdersPayoutToTransferAmount,
  computeTransferOrderTotals,
  parseTransferNotes,
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

function acceptPaidAtWindow(sum, target) {
  const delta = Math.abs(sum - target);
  if (delta <= 5) return true;
  if (target > 0 && delta / target <= 0.03) return true;
  // Trop-versé volontaire (ex. remboursement livreur poche) : garder le lot marqué
  if (target >= sum && delta <= Math.max(60, target * 0.2)) return true;
  return false;
}

/**
 * Reconstruct invoice line items for a restaurant transfer.
 * Priority:
 * 1) invoice_order_ids persistés dans notes
 * 2) Orders marked paid near this transfer (restaurant_paid_at ≈ created_at)
 * 3) Best subset in transfer.period_start → period_end
 * 4) Legacy chronological reconstruction
 */
export async function loadRestaurantTransferInvoiceData(supabaseAdmin, transferId, options = {}) {
  const excludeOrderIds = options.excludeOrderIds instanceof Set ? options.excludeOrderIds : new Set();

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

  const availableOrders = paidOrders.filter((o) => !excludeOrderIds.has(o.id));
  const target = parseFloat(transfer.amount || 0);
  let orders = [];
  let selectionMode = 'none';
  const { orderIds: persistedIds, text: notesText } = parseTransferNotes(transfer.notes);

  // 1) IDs persistés (après régénération / création corrigée)
  if (persistedIds?.length) {
    const byId = new Map(paidOrders.map((o) => [o.id, o]));
    const picked = persistedIds.map((id) => byId.get(id)).filter(Boolean);
    if (picked.length) {
      orders = picked;
      selectionMode = 'persisted_ids';
    }
  }

  // 2) Commandes marquées payées au moment de CE virement
  if (orders.length === 0) {
    const anchorIso = transfer.invoice_generated_at || transfer.created_at;
    if (anchorIso) {
      const anchorMs = new Date(anchorIso).getTime();
      const windowMs = 15 * 60 * 1000;
      const nearPaid = availableOrders.filter((o) => {
        if (!o.restaurant_paid_at) return false;
        const t = new Date(o.restaurant_paid_at).getTime();
        return Number.isFinite(t) && Math.abs(t - anchorMs) <= windowMs;
      });
      if (nearPaid.length > 0) {
        const sum = sumPayouts(nearPaid, restaurant);
        if (acceptPaidAtWindow(sum, target)) {
          if (sum > target + 5) {
            const subset = selectOrdersForTransferAmount(nearPaid, 0, target);
            orders = subset.orders.length ? subset.orders : nearPaid;
            selectionMode = 'paid_at_window_subset';
          } else {
            orders = nearPaid;
            selectionMode = 'paid_at_window';
          }
        }
      }
    }
  }

  // 3) Meilleur préfixe dans la période stockée
  if (orders.length === 0 && transfer.period_start && transfer.period_end) {
    const inPeriod = availableOrders.filter((o) => {
      const d = toParisDateString(o.created_at);
      return d >= transfer.period_start && d <= transfer.period_end;
    });
    const paidInPeriod = inPeriod.filter((o) => o.restaurant_paid_at);
    const candidates = paidInPeriod.length ? paidInPeriod : inPeriod;
    if (candidates.length > 0) {
      const selected = selectOrdersForTransferAmount(candidates, 0, target);
      orders = selected.orders.length ? selected.orders : candidates;
      selectionMode = 'period_best_fit';
    }
  }

  // 4) Fallback legacy : consommer les virements antérieurs puis préfixe au montant
  if (orders.length === 0) {
    const { data: priorTransfers } = await supabaseAdmin
      .from('restaurant_transfers')
      .select('id, amount, transfer_date, created_at, period_start, period_end')
      .eq('restaurant_id', transfer.restaurant_id)
      .eq('status', 'completed')
      .order('transfer_date', { ascending: true })
      .order('created_at', { ascending: true });

    const priors = (priorTransfers || []).filter((t) => t.id !== transfer.id);
    const priorIds = new Set(excludeOrderIds);

    // Si on a des IDs exclus fournis (régénération globale), on ne rejoue pas les priors
    let pool = availableOrders;
    if (!excludeOrderIds.size) {
      let startIdx = 0;
      for (const t of priors) {
        const { nextIdx, orders: priorOrders } = selectOrdersForTransferAmount(paidOrders, startIdx, t.amount);
        startIdx = nextIdx;
        for (const o of priorOrders) priorIds.add(o.id);
      }
      pool = paidOrders.filter((o) => !priorIds.has(o.id));
    }

    let selected = selectOrdersForTransferAmount(pool, 0, transfer.amount);
    let bestDelta = Math.abs(round2(selected.sum) - target);

    if (bestDelta > 1 && !excludeOrderIds.size) {
      const excludedPeriods = priors
        .filter((t) => t.period_start && t.period_end)
        .map((t) => ({ start: t.period_start, end: t.period_end }));

      const transferDate = (transfer.transfer_date || '').slice(0, 10);
      const cutoff = transferDate >= '2026-06-01' ? '2026-05-31' : transferDate;

      const altPool = paidOrders.filter((o) => {
        const d = toParisDateString(o.created_at);
        if (d > cutoff) return false;
        return !excludedPeriods.some((p) => d >= p.start && d <= p.end);
      });

      if (altPool.length) {
        const alt = selectOrdersForTransferAmount(altPool, 0, transfer.amount);
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

  const naturalSum = sumPayouts(orders, restaurant);
  orders = alignOrdersPayoutToTransferAmount(orders, restaurant, transfer.amount);

  const period = periodFromOrders(orders);
  const transferForInvoice = {
    ...transfer,
    period_start: period.period_start || transfer.period_start,
    period_end: period.period_end || transfer.period_end,
    notes: notesText || (parseTransferNotes(transfer.notes).text ? parseTransferNotes(transfer.notes).text : (
      transfer.notes && !String(transfer.notes).trim().startsWith('{') ? transfer.notes : null
    )),
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
    naturalSum,
    orderIds: orders.map((o) => o.id),
    notesText: transferForInvoice.notes,
  };
}

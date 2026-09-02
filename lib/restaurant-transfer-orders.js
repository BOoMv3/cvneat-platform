import {
  computeCommissionAndPayout,
  getEffectiveCommissionRatePercent,
  getFixedCommissionRatePercentFromName,
  round2,
} from './commission.js';

export function getOrderArticlesSubtotalEur(order) {
  const total = parseFloat(order?.total || 0) || 0;
  const discount = parseFloat(order?.discount_amount || 0) || 0;
  return Math.max(0, round2(total - discount));
}

export function computeTransferOrderPayoutEur(order, restaurant) {
  if (order?._invoice_payout_override != null && order._invoice_payout_override !== '') {
    return round2(parseFloat(order._invoice_payout_override));
  }

  const subtotal = getOrderArticlesSubtotalEur(order);
  const subsidy = parseFloat(order?.loyalty_article_subsidy_eur || 0) || 0;
  const fixed = getFixedCommissionRatePercentFromName(restaurant?.nom);

  // Taux fixes : toujours recalculer (évite historiques incohérents)
  if (fixed === 0) return round2(subtotal + subsidy);
  if (fixed != null) {
    return round2(computeCommissionAndPayout(subtotal, fixed).payout + subsidy);
  }

  const stored = order?.restaurant_payout;
  if (stored != null && stored !== '' && !Number.isNaN(parseFloat(stored))) {
    return round2(parseFloat(stored));
  }

  const storedCommission = order?.commission_amount;
  if (storedCommission != null && storedCommission !== '' && !Number.isNaN(parseFloat(storedCommission))) {
    return round2(subtotal - parseFloat(storedCommission) + subsidy);
  }

  const ratePercent = getEffectiveCommissionRatePercent({
    restaurantName: restaurant?.nom,
    orderRatePercent: order?.commission_rate,
    restaurantRatePercent: restaurant?.commission_rate,
  });
  return round2(computeCommissionAndPayout(subtotal, ratePercent).payout + subsidy);
}

export function computeTransferOrderCommissionEur(order, restaurant) {
  if (order?._invoice_commission_override != null && order._invoice_commission_override !== '') {
    return round2(parseFloat(order._invoice_commission_override));
  }

  const subtotal = getOrderArticlesSubtotalEur(order);
  const fixed = getFixedCommissionRatePercentFromName(restaurant?.nom);
  if (fixed === 0) return 0;
  if (fixed != null) {
    return round2(computeCommissionAndPayout(subtotal, fixed).commission);
  }

  const stored = order?.commission_amount;
  if (stored != null && stored !== '' && !Number.isNaN(parseFloat(stored))) {
    return round2(parseFloat(stored));
  }

  const ratePercent = getEffectiveCommissionRatePercent({
    restaurantName: restaurant?.nom,
    orderRatePercent: order?.commission_rate,
    restaurantRatePercent: restaurant?.commission_rate,
  });
  return round2(computeCommissionAndPayout(subtotal, ratePercent).commission);
}

function payoutForOrder(order) {
  return computeTransferOrderPayoutEur(order, order._restaurant || order.restaurant);
}

/**
 * Sélectionne les commandes couvertes par un virement (chronologique depuis startIdx).
 * Parmi les préfixes possibles, garde celui dont le total est le plus proche du montant viré.
 */
export function selectOrdersForTransferAmount(orders, startIdx, targetAmount) {
  const target = parseFloat(targetAmount || 0);
  if (startIdx >= orders.length || target <= 0) {
    return { orders: [], nextIdx: startIdx, sum: 0 };
  }

  let best = { orders: [], nextIdx: startIdx, sum: 0, delta: Infinity };
  let sum = 0;
  const picked = [];
  const overrun = Math.max(25, target * 0.15);

  for (let i = startIdx; i < orders.length; i += 1) {
    const payout = payoutForOrder(orders[i]);
    picked.push(orders[i]);
    sum = round2(sum + payout);
    const delta = Math.abs(sum - target);

    if (delta < best.delta) {
      best = { orders: [...picked], nextIdx: i + 1, sum, delta };
    }

    if (sum > target + overrun) break;
  }

  if (best.orders.length === 0) {
    const payout = payoutForOrder(orders[startIdx]);
    return { orders: [orders[startIdx]], nextIdx: startIdx + 1, sum: payout };
  }

  return { orders: best.orders, nextIdx: best.nextIdx, sum: best.sum };
}

export function computeTransferOrderTotals(orders, restaurant) {
  const raw = (orders || []).reduce(
    (acc, o) => {
      acc.totalRevenue += getOrderArticlesSubtotalEur(o);
      acc.totalCommission += computeTransferOrderCommissionEur(o, restaurant);
      acc.totalPayoutDue += computeTransferOrderPayoutEur(o, restaurant);
      return acc;
    },
    { totalRevenue: 0, totalCommission: 0, totalPayoutDue: 0 }
  );
  return {
    totalRevenue: round2(raw.totalRevenue),
    totalCommission: round2(raw.totalCommission),
    totalPayoutDue: round2(raw.totalPayoutDue),
  };
}

export function toParisDateString(iso) {
  return new Date(iso).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

/**
 * Ajuste la dernière commande du lot pour que le total facture = montant viré
 * (sans ligne d'ajustement visible pour le partenaire).
 */
export function alignOrdersPayoutToTransferAmount(orders, restaurant, targetAmount) {
  if (!orders?.length) return [];

  const target = round2(parseFloat(targetAmount || 0));
  const totals = computeTransferOrderTotals(orders, restaurant);
  const delta = round2(target - totals.totalPayoutDue);
  if (Math.abs(delta) < 0.005) return orders;

  const adjusted = orders.map((o, i) => (i === orders.length - 1 ? { ...o } : o));
  const last = adjusted[adjusted.length - 1];
  const basePayout = computeTransferOrderPayoutEur(last, restaurant);
  const baseCommission = computeTransferOrderCommissionEur(last, restaurant);

  last._invoice_payout_override = round2(Math.max(0, basePayout + delta));
  // Commission peut devenir 0 si le delta (trop-versé / ajustement) dépasse la commission
  last._invoice_commission_override = round2(Math.max(0, baseCommission - delta));

  return adjusted;
}

export function periodFromOrders(orders) {
  if (!orders?.length) return { period_start: null, period_end: null };
  return {
    period_start: toParisDateString(orders[0].created_at),
    period_end: toParisDateString(orders[orders.length - 1].created_at),
  };
}

/** Parse notes virement : texte libre ou JSON { invoice_order_ids, note }. */
export function parseTransferNotes(notes) {
  if (!notes) return { orderIds: null, text: null };
  const raw = String(notes).trim();
  if (!raw) return { orderIds: null, text: null };
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      const orderIds = Array.isArray(parsed?.invoice_order_ids)
        ? parsed.invoice_order_ids.map((id) => String(id)).filter(Boolean)
        : null;
      const text = parsed?.note || parsed?.text || null;
      return { orderIds, text: text ? String(text) : null };
    } catch {
      return { orderIds: null, text: raw };
    }
  }
  return { orderIds: null, text: raw };
}

export function serializeTransferNotes({ orderIds, text }) {
  const ids = Array.isArray(orderIds) ? orderIds.filter(Boolean) : [];
  const note = text && String(text).trim() ? String(text).trim() : null;
  if (!ids.length && !note) return null;
  if (!ids.length) return note;
  return JSON.stringify({
    invoice_order_ids: ids,
    ...(note ? { note } : {}),
  });
}

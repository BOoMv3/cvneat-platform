import {
  computeCommissionAndPayout,
  getEffectiveCommissionRatePercent,
  getFixedCommissionRatePercentFromName,
  round2,
} from './commission.js';

const TOLERANCE = 0.05;

export function getOrderArticlesSubtotalEur(order) {
  const total = parseFloat(order?.total || 0) || 0;
  const discount = parseFloat(order?.discount_amount || 0) || 0;
  return Math.max(0, round2(total - discount));
}

export function computeTransferOrderPayoutEur(order, restaurant) {
  if (order?._invoice_payout_override != null && order._invoice_payout_override !== '') {
    return round2(parseFloat(order._invoice_payout_override));
  }

  const stored = order?.restaurant_payout;
  if (stored != null && stored !== '' && !Number.isNaN(parseFloat(stored))) {
    return round2(parseFloat(stored));
  }

  const subtotal = getOrderArticlesSubtotalEur(order);
  const subsidy = parseFloat(order?.loyalty_article_subsidy_eur || 0) || 0;
  const fixed = getFixedCommissionRatePercentFromName(restaurant?.nom);
  if (fixed === 0) return round2(subtotal + subsidy);

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

  const stored = order?.commission_amount;
  if (stored != null && stored !== '' && !Number.isNaN(parseFloat(stored))) {
    return round2(parseFloat(stored));
  }

  const subtotal = getOrderArticlesSubtotalEur(order);
  const fixed = getFixedCommissionRatePercentFromName(restaurant?.nom);
  if (fixed === 0) return 0;

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

  for (let i = startIdx; i < orders.length; i += 1) {
    const payout = payoutForOrder(orders[i]);
    picked.push(orders[i]);
    sum = round2(sum + payout);
    const delta = Math.abs(sum - target);

    if (delta < best.delta) {
      best = { orders: [...picked], nextIdx: i + 1, sum, delta };
    }

    // Arrêter seulement si on dépasse largement le virement (évite des listes infinies)
    if (sum > target + 25) break;
  }

  if (best.orders.length === 0) {
    const payout = payoutForOrder(orders[startIdx]);
    return { orders: [orders[startIdx]], nextIdx: startIdx + 1, sum: payout };
  }

  return { orders: best.orders, nextIdx: best.nextIdx, sum: best.sum };
}

export function computeTransferOrderTotals(orders, restaurant) {
  return (orders || []).reduce(
    (acc, o) => {
      acc.totalRevenue += parseFloat(o.total || 0) || 0;
      acc.totalCommission += computeTransferOrderCommissionEur(o, restaurant);
      acc.totalPayoutDue += computeTransferOrderPayoutEur(o, restaurant);
      return acc;
    },
    { totalRevenue: 0, totalCommission: 0, totalPayoutDue: 0 }
  );
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

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

/** Sélectionne les commandes couvertes par un virement (allocation chronologique). */
export function selectOrdersForTransferAmount(orders, startIdx, targetAmount) {
  let sum = 0;
  const picked = [];
  let idx = startIdx;
  const target = parseFloat(targetAmount || 0);

  while (idx < orders.length) {
    const payout = computeTransferOrderPayoutEur(orders[idx], orders[idx]._restaurant || orders[idx].restaurant);
    if (picked.length === 0 || sum + payout <= target + TOLERANCE) {
      picked.push(orders[idx]);
      sum += payout;
      idx += 1;
      if (sum >= target - TOLERANCE) break;
    } else {
      break;
    }
  }

  if (picked.length === 0 && startIdx < orders.length) {
    picked.push(orders[startIdx]);
    sum = computeTransferOrderPayoutEur(orders[startIdx], orders[startIdx]._restaurant || orders[startIdx].restaurant);
    idx = startIdx + 1;
  }

  return { orders: picked, nextIdx: idx, sum: round2(sum) };
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

export function periodFromOrders(orders) {
  if (!orders?.length) return { period_start: null, period_end: null };
  return {
    period_start: toParisDateString(orders[0].created_at),
    period_end: toParisDateString(orders[orders.length - 1].created_at),
  };
}

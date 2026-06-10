/**
 * Reversement restaurant par commande — aligné création commande (après codes promo, pas promo plateforme).
 */

import {
  computeCommissionAndPayout,
  getEffectiveCommissionRatePercent,
  getFixedCommissionRatePercentFromName,
} from './commission';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Sous-total articles après codes promo / fidélité sur articles (hors promo plateforme −50 %). */
export function getOrderArticlesAmountEur(order) {
  const total = parseFloat(order?.total || 0) || 0;
  const discount = parseFloat(order?.discount_amount || 0) || 0;
  return Math.max(0, round2(total - discount));
}

export function computeOrderRestaurantPayoutEur(order, restaurant) {
  const stored = order?.restaurant_payout;
  if (stored != null && stored !== '' && !Number.isNaN(parseFloat(stored))) {
    return round2(parseFloat(stored));
  }

  const subtotal = getOrderArticlesAmountEur(order);
  const subsidy = parseFloat(order?.loyalty_article_subsidy_eur || 0) || 0;
  const fixed = getFixedCommissionRatePercentFromName(restaurant?.nom);

  if (fixed === 0) {
    return round2(subtotal + subsidy);
  }

  const ratePercent = getEffectiveCommissionRatePercent({
    restaurantName: restaurant?.nom,
    orderRatePercent: order?.commission_rate,
    restaurantRatePercent: restaurant?.commission_rate,
  });

  const storedCommission = order?.commission_amount;
  if (storedCommission != null && storedCommission !== '' && !Number.isNaN(parseFloat(storedCommission))) {
    return round2(subtotal - parseFloat(storedCommission) + subsidy);
  }

  const { payout } = computeCommissionAndPayout(subtotal, ratePercent);
  return round2(payout + subsidy);
}

export function computeOrderCommissionEur(order, restaurant) {
  const stored = order?.commission_amount;
  if (stored != null && stored !== '' && !Number.isNaN(parseFloat(stored))) {
    return round2(parseFloat(stored));
  }

  const subtotal = getOrderArticlesAmountEur(order);
  const fixed = getFixedCommissionRatePercentFromName(restaurant?.nom);
  if (fixed === 0) return 0;

  const ratePercent = getEffectiveCommissionRatePercent({
    restaurantName: restaurant?.nom,
    orderRatePercent: order?.commission_rate,
    restaurantRatePercent: restaurant?.commission_rate,
  });
  return computeCommissionAndPayout(subtotal, ratePercent).commission;
}

/**
 * Revenu net CVN'EAT par commande livrée (avec ou sans promo plateforme).
 * Source de vérité : champs stockés en BDD ; estimation promo −50 % si manquant pendant la fenêtre active.
 */

import { getEffectiveCommissionRatePercent } from './commission';
import {
  computeWeekHalfOffPromoDiscountEur,
  isWeekHalfOffPromoActive,
} from './week-half-off-promo';

export const PLATFORM_FEE_EUR = 0.49;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function getOrderArticlesSubtotalEur(order) {
  const totalArticles = parseFloat(order?.total || 0) || 0;
  const discount = parseFloat(order?.discount_amount || 0) || 0;
  return {
    totalArticles,
    discount,
    orderAmount: Math.max(0, round2(totalArticles - discount)),
  };
}

/**
 * Promo financée par CVN'EAT (réduction Stripe / subvention client).
 * @returns {{ amount: number, source: 'stored'|'estimated_week_half'|'none' }}
 */
export function resolvePlatformDiscountEur(order) {
  const stored = parseFloat(order?.platform_discount_amount ?? 0) || 0;
  if (stored > 0) {
    return { amount: round2(stored), source: 'stored' };
  }

  const { totalArticles, orderAmount } = getOrderArticlesSubtotalEur(order);
  const createdAt = order?.created_at ? new Date(order.created_at) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    return { amount: 0, source: 'none' };
  }

  if (isWeekHalfOffPromoActive(createdAt) && totalArticles >= 15) {
    const estimated = computeWeekHalfOffPromoDiscountEur(
      { capAt: orderAmount, cartSubtotalEur: totalArticles },
      createdAt
    );
    if (estimated > 0) {
      return { amount: round2(estimated), source: 'estimated_week_half' };
    }
  }

  return { amount: 0, source: 'none' };
}

export function getOrderCommissionRateDecimal(order, restaurant) {
  const pct = getEffectiveCommissionRatePercent({
    restaurantName: restaurant?.nom,
    orderRatePercent: order?.commission_rate,
    restaurantRatePercent: restaurant?.commission_rate,
  });
  return pct / 100;
}

/**
 * @param {object} order - ligne commandes
 * @param {object} [options]
 * @param {number} [options.commissionRate] - taux décimal (ex. 0.2)
 * @param {object} [options.restaurant] - pour le taux si commission_rate absent
 */
export function computeCvneatNetRevenueEur(order, options = {}) {
  const { orderAmount } = getOrderArticlesSubtotalEur(order);

  let commissionRate = options.commissionRate;
  if (commissionRate == null && options.restaurant) {
    commissionRate = getOrderCommissionRateDecimal(order, options.restaurant);
  }
  if (commissionRate == null) {
    commissionRate = 0.2;
  }

  const storedCommission =
    order?.commission_amount != null ? parseFloat(order.commission_amount) : null;
  const commission =
    storedCommission != null && !Number.isNaN(storedCommission)
      ? round2(storedCommission)
      : round2(orderAmount * commissionRate);

  const deliveryCommission = round2(parseFloat(order?.delivery_commission_cvneat || 0) || 0);
  const { amount: platformDiscount, source: platformDiscountSource } =
    resolvePlatformDiscountEur(order);
  const loyaltySubsidy = round2(parseFloat(order?.loyalty_article_subsidy_eur || 0) || 0);
  const platformFee = PLATFORM_FEE_EUR;

  const gross = round2(commission + platformFee + deliveryCommission);
  const net = round2(gross - platformDiscount - loyaltySubsidy);

  return {
    net,
    gross,
    commission,
    platformFee,
    deliveryCommission,
    platformDiscount,
    platformDiscountSource,
    loyaltySubsidy,
    orderAmount,
  };
}

const emptyAggregate = () => ({
  net: 0,
  gross: 0,
  commission: 0,
  platformFees: 0,
  deliveryCommission: 0,
  platformPromoCost: 0,
  loyaltySubsidy: 0,
  deliveredOrders: 0,
  ordersWithPlatformPromo: 0,
  ordersWithEstimatedPromo: 0,
});

/** Fusionne un breakdown commande dans un agrégat (dashboard admin). */
export function addCvneatBreakdownToAggregate(aggregate, breakdown) {
  aggregate.net += breakdown.net;
  aggregate.gross += breakdown.gross;
  aggregate.commission += breakdown.commission;
  aggregate.platformFees += breakdown.platformFee;
  aggregate.deliveryCommission += breakdown.deliveryCommission;
  aggregate.platformPromoCost += breakdown.platformDiscount;
  aggregate.loyaltySubsidy += breakdown.loyaltySubsidy;
  aggregate.deliveredOrders += 1;
  if (breakdown.platformDiscount > 0) {
    aggregate.ordersWithPlatformPromo += 1;
  }
  if (breakdown.platformDiscountSource === 'estimated_week_half') {
    aggregate.ordersWithEstimatedPromo += 1;
  }
}

export function finalizeCvneatAggregate(aggregate) {
  const keys = [
    'net',
    'gross',
    'commission',
    'platformFees',
    'deliveryCommission',
    'platformPromoCost',
    'loyaltySubsidy',
  ];
  for (const key of keys) {
    aggregate[key] = round2(aggregate[key]);
  }
  return aggregate;
}

/**
 * Calcule les totaux + ventilation par mois pour le dashboard admin.
 * @param {object[]} deliveredOrders - commandes livrées payées
 * @param {Map<string, object>|object} restaurantsById - id → restaurant
 */
export function aggregateCvneatRevenue(deliveredOrders, restaurantsById) {
  const totals = emptyAggregate();
  const monthlyMap = new Map();

  const getRestaurant = (id) => {
    if (restaurantsById instanceof Map) return restaurantsById.get(id);
    if (Array.isArray(restaurantsById)) {
      return restaurantsById.find((r) => r.id === id);
    }
    return restaurantsById?.[id];
  };

  for (const order of deliveredOrders || []) {
    const restaurant = getRestaurant(order.restaurant_id);
    const breakdown = computeCvneatNetRevenueEur(order, { restaurant });
    addCvneatBreakdownToAggregate(totals, breakdown);

    const orderDate = new Date(order.created_at);
    const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, emptyAggregate());
    }
    addCvneatBreakdownToAggregate(monthlyMap.get(monthKey), breakdown);
  }

  finalizeCvneatAggregate(totals);

  const monthlyRevenue = Array.from(monthlyMap.entries())
    .map(([month, agg]) => {
      finalizeCvneatAggregate(agg);
      return {
        month,
        label: new Date(`${month}-01T12:00:00`).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
        }),
        ...agg,
        amount: agg.net,
      };
    })
    .sort((a, b) => b.month.localeCompare(a.month));

  return { totals, monthlyRevenue };
}

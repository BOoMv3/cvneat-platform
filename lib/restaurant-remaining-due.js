import {
  computeOrderCommissionEur,
  computeOrderRestaurantPayoutEur,
} from './restaurant-order-payout.js';
import { getFixedCommissionRatePercentFromName } from './commission.js';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function is99StreetFoodRestaurant(nom) {
  const n = (nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return n.includes('99 street') || n.includes('99street') || n.includes('99 street food');
}

const DEBUT_99SF_UTC = new Date('2026-03-05T23:00:00.000Z'); // 00h00 le 06/03 à Paris
const DEBUT_99SF_DATE = '2026-03-06';

/**
 * Filtre les commandes prises en compte pour le solde restaurant
 * (aligné sur /admin/payments/transfers).
 */
export function filterOrdersForRestaurantBalance(orders, restaurant, excludedCommandeIds = new Set()) {
  let paidOrders = (orders || []).filter(
    (order) =>
      !['failed', 'cancelled', 'refunded'].includes(
        (order.payment_status || '').toString().trim().toLowerCase()
      ) && !excludedCommandeIds.has((order.id || '').toString().trim().toLowerCase())
  );

  if (is99StreetFoodRestaurant(restaurant?.nom) && paidOrders.length > 0) {
    paidOrders = paidOrders.filter((o) => new Date(o.created_at) >= DEBUT_99SF_UTC);

    const seen = new Set();
    paidOrders = paidOrders.filter((order) => {
      const dateParis = order.created_at
        ? new Date(order.created_at).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
        : '';
      const key = `${dateParis}|${Number(order.total) || 0}|${(order.user_id || '').toString().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return paidOrders;
}

export function sumRelevantTransfers(transfers, restaurant) {
  const list = transfers || [];
  if (!is99StreetFoodRestaurant(restaurant?.nom)) {
    return round2(list.reduce((sum, t) => sum + (parseFloat(t.amount || 0) || 0), 0));
  }
  return round2(
    list
      .filter((t) => ((t.transfer_date || '').toString().slice(0, 10) >= DEBUT_99SF_DATE))
      .reduce((sum, t) => sum + (parseFloat(t.amount || 0) || 0), 0)
  );
}

/**
 * Reste dû = part restaurant (commandes) − virements completed.
 * Même formule que la page suivi de virements.
 */
export function computeRestaurantRemainingDue({
  restaurant,
  orders,
  transfers,
  excludedCommandeIds = new Set(),
  overrideAmount = null,
}) {
  const paidOrders = filterOrdersForRestaurantBalance(orders, restaurant, excludedCommandeIds);

  let commission = 0;
  let restaurantPayout = 0;
  paidOrders.forEach((o) => {
    commission += computeOrderCommissionEur(o, restaurant);
    restaurantPayout += computeOrderRestaurantPayoutEur(o, restaurant);
  });
  commission = round2(commission);
  restaurantPayout = round2(restaurantPayout);

  const totalTransfers = sumRelevantTransfers(transfers, restaurant);
  let remainingToPay = Math.max(0, round2(restaurantPayout - totalTransfers));

  const is99 = is99StreetFoodRestaurant(restaurant?.nom);
  if (is99) {
    remainingToPay = Math.max(0, round2(remainingToPay - 15));
  }

  const hasManualOverride = overrideAmount != null && overrideAmount !== '';
  if (hasManualOverride) {
    const override = parseFloat(overrideAmount);
    remainingToPay = Number.isFinite(override) ? Math.max(0, round2(override)) : remainingToPay;
  }

  const fixedRate = getFixedCommissionRatePercentFromName(restaurant?.nom);
  const defaultRate =
    restaurant?.commission_rate !== null && restaurant?.commission_rate !== undefined
      ? parseFloat(restaurant.commission_rate)
      : null;

  return {
    paidOrders,
    commission,
    restaurantPayout,
    totalTransfers,
    remainingToPay,
    orderCount: paidOrders.length,
    commissionRate: fixedRate !== null ? fixedRate : (Number.isFinite(defaultRate) ? defaultRate : 20),
    is99StreetFood: is99,
    hasManualOverride,
  };
}

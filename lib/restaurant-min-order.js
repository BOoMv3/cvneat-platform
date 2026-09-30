/** Minimum de commande affiché et appliqué (fallback si pas de colonne DB). */
export const DEFAULT_RESTAURANT_MIN_ORDER_EUR = 15;

/**
 * Lit le minimum de commande d'un restaurant (plusieurs noms de champs possibles).
 * @param {object|null|undefined} restaurant
 * @returns {number}
 */
export function getRestaurantMinOrderEur(restaurant) {
  const raw =
    restaurant?.commande_min ??
    restaurant?.minOrder ??
    restaurant?.min_order ??
    restaurant?.minimum_order ??
    DEFAULT_RESTAURANT_MIN_ORDER_EUR;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_RESTAURANT_MIN_ORDER_EUR;
  return Math.round(n * 100) / 100;
}

/**
 * Vérifie si le sous-total articles atteint le minimum.
 * @param {number} subtotalEur
 * @param {object|null|undefined} restaurant
 */
export function isMinOrderReached(subtotalEur, restaurant) {
  const min = getRestaurantMinOrderEur(restaurant);
  const sub = Math.round((Number(subtotalEur) || 0) * 100) / 100;
  return { ok: sub + 1e-9 >= min, min, sub, missing: Math.max(0, Math.round((min - sub) * 100) / 100) };
}

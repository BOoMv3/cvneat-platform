// Règles de commission (France)
// - La Bonne Pâte: 0%
// - All'ovale pizza: 15%
// - Tous les autres: restaurant.commission_rate si présent, sinon 20%

export function normalizeRestaurantName(name) {
  return (name || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getFixedCommissionRatePercentFromName(name) {
  const n = normalizeRestaurantName(name);
  if (!n) return null;

  // Tolérer plusieurs variantes
  const isBonnePate = n.includes('bonne pate');
  if (isBonnePate) return 0;

  const isAllovale =
    n.includes("all'ovale") ||
    n.includes('allovale') ||
    n.includes('all ovale');
  if (isAllovale) return 15;

  return null;
}

export function parseRatePercent(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Détermine le taux effectif à appliquer pour une commande.
 * Priorité:
 * 1) Règle fixe par restaurant (Bonne Pâte / All'ovale)
 * 2) order.commission_rate (taux stocké au moment de la commande)
 * 3) restaurant.commission_rate
 * 4) 20%
 */
export function getEffectiveCommissionRatePercent({
  restaurantName,
  orderRatePercent,
  restaurantRatePercent,
} = {}) {
  const fixed = getFixedCommissionRatePercentFromName(restaurantName);
  if (fixed !== null) return fixed;

  const o = parseRatePercent(orderRatePercent);
  if (o !== null) return o;

  const r = parseRatePercent(restaurantRatePercent);
  if (r !== null) return r;

  return 20;
}

export function computeCommissionAndPayout(total, ratePercent) {
  const t = Number(total) || 0;
  const r = Number(ratePercent) || 0;
  const commission = round2((t * r) / 100);
  const payout = round2(t - commission);
  return { commission, payout };
}



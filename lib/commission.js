// Commission CVN'EAT (France)
// - Livraison : 20 % HT sur le montant articles (après promo), sauf si restaurant.commission_rate est défini
// - Retrait sur place : 15 % HT
// - CVN'EAT est en franchise de TVA (art. 293 B CGI) → la commission est libellée HT (pas de TVA ajoutée dessus)

export function normalizeRestaurantName(name) {
  return (name || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Anciennes exceptions (Bonne Pâte 0 %, All'ovale 15 %) — désactivées.
 * Conservé pour compatibilité des imports ; retourne toujours null.
 */
export function getFixedCommissionRatePercentFromName(_name) {
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
 * Taux effectif livraison.
 * Priorité:
 * 1) order.commission_rate (taux stocké au moment de la commande)
 * 2) restaurant.commission_rate
 * 3) 20 %
 */
export function getEffectiveCommissionRatePercent({
  orderRatePercent,
  restaurantRatePercent,
} = {}) {
  const o = parseRatePercent(orderRatePercent);
  if (o !== null) return o;

  const r = parseRatePercent(restaurantRatePercent);
  if (r !== null) return r;

  return 20;
}

/**
 * Calcul : commission HT = montant_articles × taux / 100
 * Exemple : 50 € d'articles × 20 % = 10 € de commission → resto 40 €
 */
export function computeCommissionAndPayout(total, ratePercent) {
  const t = Number(total) || 0;
  const r = Number(ratePercent) || 0;
  const commission = round2((t * r) / 100);
  const payout = round2(t - commission);
  return { commission, payout };
}

/** Retrait sur place : 15 % HT pour tous les restaurants. */
export function getPickupCommissionRatePercent() {
  return 15;
}

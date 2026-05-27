/**
 * Promos plateforme financées par CVN'EAT (réduction sur le montant Stripe, pas sur le reversement restaurant).
 */
import { getItemLineTotal } from '@/lib/cartUtils';
import {
  computeWeekHalfOffPromoDiscountEur,
  isWeekHalfOffPromoActive,
  WEEK_HALF_OFF_PROMO_CHECKOUT_LINE,
} from '@/lib/week-half-off-promo';

export {
  isWeekHalfOffPromoActive,
  WEEK_HALF_OFF_PROMO_BANNER,
  WEEK_HALF_OFF_PROMO_CHECKOUT_LINE,
} from '@/lib/week-half-off-promo';

/** Date calendaire Paris (YYYY-MM-DD) */
export function getParisCalendarYmd(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Vendredi 17 avril 2026 (Paris) : -50 % sur le 2e article (le moins cher), par paires d’unités. */
export const SECOND_ARTICLE_PROMO_PARIS_DATE = '2026-04-17';
export const SECOND_ARTICLE_PROMO_ACTIVE = false;

export function isSecondArticlePromoActive(date = new Date()) {
  if (!SECOND_ARTICLE_PROMO_ACTIVE) return false;
  return getParisCalendarYmd(date) === SECOND_ARTICLE_PROMO_PARIS_DATE;
}

export const SECOND_ARTICLE_PROMO_BANNER =
  'Vendredi 17 avril : -50 % sur le 2e article (le moins cher)';

export const SECOND_ARTICLE_PROMO_CHECKOUT_LINE = 'Promo 2e article -50 %';

/**
 * Développe chaque ligne du panier en unités au prix unitaire TTC (base + extras / quantité),
 * trie par prix croissant, forme des paires : sur chaque paire, -50 % sur le moins cher.
 * @param {object} options.capAt — plafond (ex. sous-total après autres réductions)
 */
export function computeSecondArticlePromoDiscountFromItems(items = [], options = {}) {
  if (!isSecondArticlePromoActive()) return 0;
  if (!Array.isArray(items) || items.length === 0) return 0;

  const capRaw = options.capAt;
  const capAt = Number.isFinite(capRaw) ? Math.max(0, Number(capRaw)) : null;

  const units = [];
  for (const item of items) {
    if (!item) continue;
    const lineTotal = getItemLineTotal(item);
    const q = Math.max(1, parseInt(item?.quantity ?? 1, 10) || 1);
    const unit = Math.round((lineTotal / q) * 100) / 100;
    for (let i = 0; i < q; i++) units.push(unit);
  }

  if (units.length < 2) return 0;

  units.sort((a, b) => a - b);

  let discount = 0;
  for (let i = 0; i + 1 < units.length; i += 2) {
    discount += 0.5 * units[i];
  }

  discount = Math.round(discount * 100) / 100;
  if (capAt != null) {
    discount = Math.min(discount, capAt);
  }
  return discount;
}

/** @deprecated Ancienne promo -5 % globale ; conservé pour compat imports éventuels. */
export const PLATFORM_PROMO_ACTIVE = false;
export const PLATFORM_PROMO_RATE = 0.05;
export const PLATFORM_PROMO_LABEL = '-5% sur toute commande';

export function computePlatformPromoDiscount() {
  return 0;
}

// ---------------------------------------------------------------------------
// Promo stocks La Bonne Pâte : sur 2 pizzas commandées, -50 % sur la moins chère
// (uniquement lignes catégorie « Pizzas - … », pas Puccias / desserts / boissons).
// Uniquement ce restaurant (nom contient « bonne pâte ») — voir computeCheckoutPlatformDiscountEur.
// Après l’événement : LA_BONNE_PATE_STOCK_PROMO_ACTIVE = false (ou retirer la date Paris ci-dessous).
// ---------------------------------------------------------------------------

export const LA_BONNE_PATE_STOCK_PROMO_ACTIVE = false;

/** Date calendaire Paris (YYYY-MM-DD) où la promo tourne ; null = tous les jours tant que ACTIVE. */
export const LA_BONNE_PATE_STOCK_PROMO_PARIS_YMD = '2026-05-03';

export const LA_BONNE_PATE_STOCK_PROMO_BANNER =
  "La Bonne Pâte : 2e pizza -50 % (la moins chère des deux) — appliqué au panier et au paiement.";

export const LA_BONNE_PATE_STOCK_PROMO_CHECKOUT_LINE = 'Promo 2e pizza La Bonne Pâte -50 %';

/** Promo La Bonne Pâte (stocks) : interrupteur + fenêtre jour Paris optionnelle. */
export function isLaBonnePateStockPromoEffective(date = new Date()) {
  if (!LA_BONNE_PATE_STOCK_PROMO_ACTIVE) return false;
  if (LA_BONNE_PATE_STOCK_PROMO_PARIS_YMD == null || LA_BONNE_PATE_STOCK_PROMO_PARIS_YMD === '') {
    return true;
  }
  return getParisCalendarYmd(date) === LA_BONNE_PATE_STOCK_PROMO_PARIS_YMD;
}

function normalizeAsciiLower(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Détecte le restaurant La Bonne Pâte (nom affiché / en base). */
export function isLaBonnePateRestaurantName(name) {
  const n = normalizeAsciiLower(name);
  return n.includes('bonne pate');
}

/** Ligne panier / commande considérée comme une pizza (carte La Bonne Pâte). */
export function isLaBonnePatePizzaCartLine(item) {
  if (!item) return false;
  const c = item.customizations || {};
  if (c.is_formula_drink === true || c.is_menu_drink === true) return false;
  const cat = normalizeAsciiLower(item.category || item.categorie || '');
  if (!cat.includes('pizz')) return false;
  if (cat.includes('puccia')) return false;
  return true;
}

/**
 * Même logique que la promo « 2e article » mais uniquement sur les unités pizza.
 */
export function computeBonnePateSecondPizzaDiscountFromItems(items = [], options = {}) {
  if (!isLaBonnePateStockPromoEffective()) return 0;
  if (!isLaBonnePateRestaurantName(options.restaurantName)) return 0;
  if (!Array.isArray(items) || items.length === 0) return 0;

  const capRaw = options.capAt;
  const capAt = Number.isFinite(capRaw) ? Math.max(0, Number(capRaw)) : null;

  const units = [];
  for (const item of items) {
    if (!item || !isLaBonnePatePizzaCartLine(item)) continue;
    const lineTotal = getItemLineTotal(item);
    const q = Math.max(1, parseInt(item?.quantity ?? 1, 10) || 1);
    const unit = Math.round((lineTotal / q) * 100) / 100;
    for (let i = 0; i < q; i++) units.push(unit);
  }

  if (units.length < 2) return 0;

  units.sort((a, b) => a - b);

  let discount = 0;
  for (let i = 0; i + 1 < units.length; i += 2) {
    discount += 0.5 * units[i];
  }

  discount = Math.round(discount * 100) / 100;
  if (capAt != null) {
    discount = Math.min(discount, capAt);
  }
  return discount;
}

/**
 * Libellé ligne checkout pour la réduction plateforme affichée au client.
 */
export function getPlatformPromoCheckoutLine(restaurantName) {
  if (isWeekHalfOffPromoActive()) return WEEK_HALF_OFF_PROMO_CHECKOUT_LINE;
  if (isLaBonnePateRestaurantName(restaurantName)) return LA_BONNE_PATE_STOCK_PROMO_CHECKOUT_LINE;
  return SECOND_ARTICLE_PROMO_CHECKOUT_LINE;
}

/**
 * Réduction « plateforme » au checkout : promo semaine −50 % (prioritaire) OU 2e article / La Bonne Pâte.
 */
export function computeCheckoutPlatformDiscountEur(items = [], options = {}) {
  const capAt = options.capAt;
  const cartSubtotalEur = options.cartSubtotalEur;
  const weekDiscount = computeWeekHalfOffPromoDiscountEur(
    { capAt, cartSubtotalEur },
    options.now
  );
  if (weekDiscount > 0) return weekDiscount;

  const restaurantName = options.restaurantName;
  if (isLaBonnePateRestaurantName(restaurantName)) {
    return computeBonnePateSecondPizzaDiscountFromItems(items, { capAt, restaurantName });
  }
  return computeSecondArticlePromoDiscountFromItems(items, { capAt });
}

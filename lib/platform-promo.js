/**
 * Promos plateforme financées par CVN'EAT (réduction sur le montant Stripe, pas sur le reversement restaurant).
 */
import { getItemLineTotal } from '@/lib/cartUtils';

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

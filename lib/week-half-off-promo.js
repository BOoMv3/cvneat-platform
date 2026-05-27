/**
 * Promo plateforme : −50 % sur le sous-total articles (tous restaurants).
 * Financée par CVN'EAT → platform_discount_amount (réduction Stripe, pas commission resto).
 */

function getParisCalendarYmd(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export const WEEK_HALF_OFF_PROMO_ENABLED = true;

/** Fenêtre inclusive (calendrier Paris, YYYY-MM-DD). */
export const WEEK_HALF_OFF_PROMO_START_PARIS_YMD = '2026-05-27';
export const WEEK_HALF_OFF_PROMO_END_PARIS_YMD = '2026-06-03';

export const WEEK_HALF_OFF_PROMO_MIN_SUBTOTAL_EUR = 15;
export const WEEK_HALF_OFF_PROMO_RATE = 0.5;

export const WEEK_HALF_OFF_PROMO_BANNER =
  "🎉 Jusqu'au mercredi 3 juin : −50 % sur votre commande dès 15 € d'achat (tous les restaurants) — appliqué automatiquement au checkout";

export const WEEK_HALF_OFF_PROMO_CHECKOUT_LINE = 'Promo semaine −50 % (plateforme)';

export function isWeekHalfOffPromoActive(date = new Date()) {
  if (!WEEK_HALF_OFF_PROMO_ENABLED) return false;
  const ymd = getParisCalendarYmd(date);
  return ymd >= WEEK_HALF_OFF_PROMO_START_PARIS_YMD && ymd <= WEEK_HALF_OFF_PROMO_END_PARIS_YMD;
}

/**
 * @param {object} params
 * @param {number} params.capAt — plafond (sous-total articles après codes promo / fidélité sur articles)
 * @param {number} [params.cartSubtotalEur] — sous-total articles brut pour le seuil 15 €
 */
export function computeWeekHalfOffPromoDiscountEur(params = {}, date = new Date()) {
  if (!isWeekHalfOffPromoActive(date)) return 0;

  const capAt = Math.max(0, Number(params.capAt) || 0);
  const cartSubtotal = Math.max(
    0,
    Number(params.cartSubtotalEur ?? params.capAt) || 0
  );
  if (cartSubtotal < WEEK_HALF_OFF_PROMO_MIN_SUBTOTAL_EUR) return 0;

  const raw = capAt * WEEK_HALF_OFF_PROMO_RATE;
  return Math.min(capAt, Math.round(raw * 100) / 100);
}

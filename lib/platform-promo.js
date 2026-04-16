/**
 * Promo plateforme financée par CVN'EAT.
 * Ne doit pas réduire le reversement restaurant: on l'applique au montant payé côté Stripe.
 */
export const PLATFORM_PROMO_ACTIVE = false;
export const PLATFORM_PROMO_RATE = 0.05; // -5%
export const PLATFORM_PROMO_LABEL = '-5% sur toute commande';

export function computePlatformPromoDiscount(baseAmountEur = 0) {
  if (!PLATFORM_PROMO_ACTIVE) return 0;
  const base = Math.max(0, Number(baseAmountEur) || 0);
  return Math.round(base * PLATFORM_PROMO_RATE * 100) / 100;
}

/**
 * Abonnement **CVN'EAT Plus** (marque : CVN'EAT / cvneat.fr) — calé sur l’idée d’Uber One,
 * mais ici on facture un abonnement et on **partage** le coût de la livraison (50 %), pas 0 € :
 * le reste (livreur, carburant) est couvert par le tarif normal de la course.
 */

/** Libellé affiché (ne pas raccourcir en « vneat » : la marque est CVN'EAT). */
export const CVNEAT_PLUS_NAME = "CVN'EAT Plus";

/** Sous-total articles (après code promo) pour bénéficier de l’avantage abonné. */
export const CVNEAT_PLUS_MIN_ORDER_EUR = 20;

/** Part des frais de livraison payée par le client (l’autre moitié reste pour couvrir la course / livreur). */
export const CVNEAT_PLUS_DELIVERY_CLIENT_SHARE = 0.5;

export const CVNEAT_PLUS_PITCH = {
  name: CVNEAT_PLUS_NAME,
  monthlyEur: 4.99,
  yearlyEur: 49.99,
  competitorLabel:
    "Sur les grandes apps, l’abonnement type « One » comprend souvent la livraison 0 € sur des conditions précises. CVN'EAT Plus reprend la logique d’avantages abonnés adaptée au service local.",
  benefits: [
    '−50 % sur les frais de livraison (commandes en zone, mêmes règles de distance)',
    'Frais plateforme offerts (0,49 €) sur les commandes éligibles',
    'Bonus fidélité abonné : +20% de points sur les commandes éligibles',
    `Sous-total d’au moins ${CVNEAT_PLUS_MIN_ORDER_EUR} € d’articles (après code promo)`,
  ],
};

export function isCvneatPlusActive(endsAt) {
  if (endsAt == null) return false;
  const t = typeof endsAt === 'string' ? new Date(endsAt).getTime() : new Date(endsAt).getTime();
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

/**
 * @param {object} p
 * @param {number} p.subtotalAfterPromoEur
 * @param {boolean} p.promoFreeDelivery
 * @param {string|null|undefined} p.loyaltyRewardId
 */
export function cvneatPlusEligibilityForDeliveryDiscount({ subtotalAfterPromoEur, promoFreeDelivery, loyaltyRewardId }) {
  if (promoFreeDelivery) return false;
  if (loyaltyRewardId === 'livraison-gratuite') return false;
  return Math.max(0, Number(subtotalAfterPromoEur) || 0) >= CVNEAT_PLUS_MIN_ORDER_EUR;
}

/**
 * Même condition d'éligibilité que la remise livraison.
 * On centralise pour éviter un écart client/serveur.
 */
export function cvneatPlusAppliesToPlatformFeeWaiver({
  subtotalAfterPromoEur,
  promoFreeDelivery,
  loyaltyRewardId,
}) {
  return cvneatPlusEligibilityForDeliveryDiscount({
    subtotalAfterPromoEur,
    promoFreeDelivery,
    loyaltyRewardId,
  });
}

/**
 * Frais facturés au client après abonnement (50 % des frais calculés, arrondi 2 décimales).
 * @param {number} baseDeliveryFeeEur — frais issus de l’API livraison (avant abonnement)
 */
export function applyCvneatPlusHalfOnDelivery(baseDeliveryFeeEur) {
  const f = Math.max(0, Number(baseDeliveryFeeEur) || 0);
  if (f <= 0) return 0;
  return Math.round(f * CVNEAT_PLUS_DELIVERY_CLIENT_SHARE * 100) / 100;
}

/**
 * Abonnement CVN'Plus — calé sur l'idée d'Uber One (FR) :
 * ~5,99€/mois, livraison 0 sur commandes éligibles, minimum panier (souvent 12€ côté Uber Eats).
 * Ici : tarif local, une seule zone (livraison CVN'EAT existante), pas d'autres canaux.
 */

export const VNEAT_PLUS_NAME = "CVN'Plus";

/** Sous-total articles (après code promo) minimum pour activer la livraison offerte, comme Uber Eats. */
export const VNEAT_PLUS_MIN_ORDER_EUR = 12;

export const VNEAT_PLUS_PITCH = {
  name: VNEAT_PLUS_NAME,
  /** Recommandé côté Stripe (prix public indicatif) — l’abonnement réel est le Price ID Stripe. */
  monthlyEur: 4.99,
  yearlyEur: 49.99,
  competitorLabel: "Uber One (France) est en général autour de 5,99 €/mois ou 59,99 €/an, avec livraison 0 sur commandes éligibles (souvent 12 € minimum) et d’autres réductions.",
  benefits: [
    'Livraison offerte sur les commandes en zone desservie (même règles de distance qu’aujourd’hui)',
    `Sous-total panier d’au moins ${VNEAT_PLUS_MIN_ORDER_EUR} € (après code promo)`,
    'Moins cher qu’un aller–retour en carburant dès 2–3 commandes / mois sur la zone',
  ],
};

export function isVneatPlusActive(endsAt) {
  if (endsAt == null) return false;
  const t = typeof endsAt === 'string' ? new Date(endsAt).getTime() : new Date(endsAt).getTime();
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

/**
 * @param {object} p
 * @param {number} p.subtotalAfterPromoEur
 * @param {boolean} p.promoFreeDelivery
 * @param {string|null|undefined} p.loyaltyRewardId — ex. 'livraison-gratuite'
 */
export function vneatPlusAppliesToDelivery({ subtotalAfterPromoEur, promoFreeDelivery, loyaltyRewardId }) {
  if (promoFreeDelivery) return false;
  if (loyaltyRewardId === 'livraison-gratuite') return false;
  return Math.max(0, Number(subtotalAfterPromoEur) || 0) >= VNEAT_PLUS_MIN_ORDER_EUR;
}

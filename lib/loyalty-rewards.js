/**
 * Programme fidélité CVN'EAT — récompenses à paliers uniquement.
 * Les points ne valent PAS 1 € chacun : ils servent uniquement à « acheter » une récompense du catalogue.
 * Cumul : 1 point par euro dépensé sur les articles (commandes livrées) — voir payment/confirm.
 */

export const LOYALTY_POINTS_PER_EURO_SPENT = 1;

/** Montant forfaitaire ajouté au reversement restaurant quand la récompense « article offert » est utilisée (compta CVN'EAT). */
export const LOYALTY_ARTICLE_RESTAURANT_SUBSIDY_EUR = 7;

export const LOYALTY_EARN_SHORT =
  'Vous cumulez 1 point par euro dépensé sur vos commandes livrées (montant des articles).';

/**
 * @typedef {{ type: 'article_note' } | { type: 'free_delivery' } | { type: 'subtotal_discount', maxEur: number }}} LoyaltyRedemption
 */

/** Récompenses : coût en points + effet métier (pas de conversion pt → €). */
export const LOYALTY_REWARDS_CATALOG = [
  {
    id: 'article-offert',
    name: 'Article offert',
    description:
      'Un dessert ou une boisson non alcoolisée au choix offerts avec la commande. Le partenaire est compensé par CVN\'EAT (montant forfaitaire programme).',
    cost: 100,
    icon: '🎁',
    available: true,
    featured: true,
    redemption: { type: 'article_note' },
  },
  {
    id: 'livraison-gratuite',
    name: 'Livraison gratuite',
    description: 'Frais de livraison offerts sur cette commande',
    cost: 160,
    icon: '🚚',
    available: true,
    featured: false,
    redemption: { type: 'free_delivery' },
  },
  {
    id: 'reduction-5',
    name: 'Réduction 5 €',
    description: '5 € de réduction sur le montant des articles (après code promo éventuel)',
    cost: 200,
    icon: '🎫',
    available: true,
    featured: false,
    redemption: { type: 'subtotal_discount', maxEur: 5 },
  },
  {
    id: 'reduction-10',
    name: 'Réduction 10 €',
    description: '10 € de réduction sur le montant des articles (après code promo éventuel)',
    cost: 400,
    icon: '💳',
    available: true,
    featured: false,
    redemption: { type: 'subtotal_discount', maxEur: 10 },
  },
];

export function getLoyaltyRewardById(rewardId) {
  if (!rewardId || typeof rewardId !== 'string') return null;
  return LOYALTY_REWARDS_CATALOG.find((r) => r.id === rewardId) || null;
}

/**
 * Calcule l’effet d’une récompense sur le sous-total articles et les frais de livraison.
 * @param {object} p
 * @param {string|null} p.rewardId
 * @param {number} p.cartSubtotalEur — sous-total articles avant toute réduction
 * @param {number} p.promoDiscountEur — réduction code promo sur les articles (déjà plafonnée au panier côté client)
 * @param {boolean} p.promoFreeDelivery
 * @param {number} p.deliveryFeeEur — frais de livraison calculés pour cette commande
 */
export function computeLoyaltyAdjustments({
  rewardId,
  cartSubtotalEur,
  promoDiscountEur = 0,
  promoFreeDelivery = false,
  deliveryFeeEur = 0,
}) {
  const reward = getLoyaltyRewardById(rewardId);
  if (!reward) {
    return {
      pointsCost: 0,
      extraDiscountOnSubtotal: 0,
      deliveryFeeEurAfter: Math.max(0, deliveryFeeEur),
      benefitStatementEur: 0,
      monetaryBenefitCustomerEur: 0,
      articleNote: null,
      articleSubsidyEur: 0,
    };
  }

  const cart = Math.max(0, Number(cartSubtotalEur) || 0);
  const promoD = Math.min(Math.max(0, Number(promoDiscountEur) || 0), cart);
  const subAfterPromo = Math.max(0, Math.round((cart - promoD) * 100) / 100);
  const del = Math.max(0, Number(deliveryFeeEur) || 0);

  let extra = 0;
  let deliveryAfter = promoFreeDelivery ? 0 : del;
  let articleNote = null;
  let articleSubsidyEur = 0;

  const { redemption } = reward;
  if (redemption.type === 'subtotal_discount') {
    extra = Math.min(redemption.maxEur, subAfterPromo);
  } else if (redemption.type === 'free_delivery') {
    if (!promoFreeDelivery && del > 0) {
      deliveryAfter = 0;
    }
  } else if (redemption.type === 'article_note') {
    articleSubsidyEur = LOYALTY_ARTICLE_RESTAURANT_SUBSIDY_EUR;
    articleNote =
      `Fidélité — article offert (dessert ou boisson non alcoolisée, dans la limite des articles éligibles du restaurant) : à honorer sans supplément. ` +
      `CVN'EAT crédite ${LOYALTY_ARTICLE_RESTAURANT_SUBSIDY_EUR}€ forfait sur votre reversement pour cette commande (plafond programme).`;
  }

  const deliverySaved = Math.max(0, Math.round((del - deliveryAfter) * 100) / 100);
  /** Réduction directe pour le client (hors subvention resto article). */
  const monetaryBenefitCustomerEur = Math.round((extra + deliverySaved) * 100) / 100;
  /** Total charge programme côté plateforme (client + subvention article). */
  const benefitStatementEur = Math.round((monetaryBenefitCustomerEur + articleSubsidyEur) * 100) / 100;

  return {
    pointsCost: reward.cost,
    extraDiscountOnSubtotal: Math.round(extra * 100) / 100,
    deliveryFeeEurAfter: Math.round(deliveryAfter * 100) / 100,
    benefitStatementEur,
    monetaryBenefitCustomerEur,
    articleNote,
    articleSubsidyEur: Math.round(articleSubsidyEur * 100) / 100,
  };
}

export function getLoyaltyRewardsSummaryLine() {
  return LOYALTY_REWARDS_CATALOG.map((r) => `${r.name} (${r.cost} pts)`).join(' · ');
}

export const LOYALTY_CHECKOUT_HELP =
  'Choisissez une seule récompense par commande. Les points déduits correspondent au palier (100, 160, 200 ou 400 pts) : ce n’est pas une conversion en euros au comptant.';

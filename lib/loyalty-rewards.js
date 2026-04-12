/**
 * Programme fidélité CVN'EAT — catalogue officiel (coûts en points).
 * Cumul : aligné avec le crédit post-commande (1 point par euro sur le panier articles, hors livraison — voir payment/confirm).
 * Utilisation : au checkout, la déduction est en euros sur le total (1 pt = 1 €), dans la limite du montant dû.
 * Les montants ci-dessous correspondent aux « récompenses » affichées côté client (le client choisit ce nombre de points au paiement).
 */

export const LOYALTY_POINTS_PER_EURO_SPENT = 1;

export const LOYALTY_EARN_SHORT =
  'Vous cumulez 1 point par euro dépensé sur vos commandes livrées (montant des articles).';

/** Récompenses échangeables (coût en points). */
export const LOYALTY_REWARDS_CATALOG = [
  {
    id: 'article-offert',
    name: 'Article offert',
    description: 'Un dessert ou une boisson au choix offert avec votre prochaine commande',
    cost: 100,
    icon: '🎁',
    available: true,
    featured: true,
  },
  {
    id: 'livraison-gratuite',
    name: 'Livraison gratuite',
    description: 'Livraison gratuite sur votre prochaine commande (équivalent en réduction sur le total)',
    cost: 160,
    icon: '🚚',
    available: true,
    featured: false,
  },
  {
    id: 'reduction-5',
    name: 'Réduction 5 €',
    description: '5 € de réduction sur votre prochaine commande',
    cost: 200,
    icon: '🎫',
    available: true,
    featured: false,
  },
  {
    id: 'reduction-10',
    name: 'Réduction 10 €',
    description: '10 € de réduction sur votre prochaine commande',
    cost: 400,
    icon: '💳',
    available: true,
    featured: false,
  },
];

/** Phrase courte pour cartes accueil / bannières. */
export function getLoyaltyRewardsSummaryLine() {
  return LOYALTY_REWARDS_CATALOG.map((r) => `${r.name} (${r.cost} pts)`).join(' · ');
}

/** Aide au moment du paiement (cohérente avec le calcul checkout 1 pt = 1 €). */
export const LOYALTY_CHECKOUT_HELP =
  'Les récompenses sont des paliers en points : au paiement, sélectionnez le même nombre de points (ex. 160 pts pour viser l’équivalent « livraison offerte » sur votre commande). Chaque point déduit 1 € sur le total à payer, dans la limite du montant dû (minimum 0,50 € après réduction).';

/**
 * Statut commande / affichage « ouvert » : uniquement ouvert_manuellement = true.
 * Plus de calcul par plages horaires (demande produit).
 *
 * - ferme_manuellement sert encore à isManuallyClosed (libellé « fermé manuellement ») quand pas ouvert manuellement.
 * - EMERGENCY_FORCE_OPEN_IDS : exception ouverte.
 *
 * Utilisé par GET /api/restaurants, GET /api/restaurants/[id], POST open-status, POST …/hours, validate commande.
 */

export const EMERGENCY_FORCE_OPEN_IDS = new Set([
  'd6725fe6-59ec-413a-b39b-ddb960824999',
  'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824',
]);

const toBool = (v) =>
  v === true ||
  v === 1 ||
  v === '1' ||
  (typeof v === 'string' && v.trim().toLowerCase() === 'true');

/**
 * @param {{ id?: string|null, horaires?: unknown, ferme_manuellement: unknown, ouvert_manuellement: unknown, now?: Date }}
 * `horaires` et `now` sont ignorés (signature conservée pour les appelants existants).
 */
export function computeRestaurantOpenState({
  id = null,
  horaires,
  ferme_manuellement,
  ouvert_manuellement,
  now = new Date(),
}) {
  if (id != null && EMERGENCY_FORCE_OPEN_IDS.has(String(id))) {
    return { isOpen: true, isManuallyClosed: false, reason: 'emergency_force_open', meta: {} };
  }
  if (toBool(ouvert_manuellement)) {
    return { isOpen: true, isManuallyClosed: false, reason: 'manual_open', meta: {} };
  }
  const fm = toBool(ferme_manuellement);
  return {
    isOpen: false,
    isManuallyClosed: fm,
    reason: fm ? 'manual_closed' : 'closed_not_manual_open',
    meta: {},
  };
}

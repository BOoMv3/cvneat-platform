/**
 * Statut « ouvert aux commandes » côté plateforme — sans horaires.
 *
 * Aligné sur le dashboard partenaire : le toggle ne met à jour que
 * `ferme_manuellement` et remet `ouvert_manuellement` à false (voir PUT partner).
 * Donc : ouvert par défaut, fermé seulement si fermeture manuelle active.
 *
 * - ouvert_manuellement : override « ouvert » (ex. admin / cas rare), prioritaire.
 * - ferme_manuellement : le partenaire a fermé → fermé + libellé fermeture manuelle.
 * - EMERGENCY_FORCE_OPEN_IDS : toujours ouvert.
 *
 * `horaires` et `now` : ignorés (signature conservée pour les appelants).
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
  if (toBool(ferme_manuellement)) {
    return { isOpen: false, isManuallyClosed: true, reason: 'manual_closed', meta: {} };
  }
  return { isOpen: true, isManuallyClosed: false, reason: 'open_not_manually_closed', meta: {} };
}

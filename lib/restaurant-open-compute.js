/**
 * Statut « ouvert aux commandes » — sans horaires.
 * Ouvert par défaut ; fermé seulement si ferme_manuellement (toggle partenaire).
 * ouvert_manuellement prioritaire ouvert ; EMERGENCY_FORCE_OPEN_IDS.
 */

export const EMERGENCY_FORCE_OPEN_IDS = new Set([
  'd6725fe6-59ec-413a-b39b-ddb960824999',
  'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824',
]);

/** True explicite (Postgres / JSON : 't', 'true', '1', …). */
export function coerceManualBool(v) {
  if (v === true || v === 1 || v === '1') return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === 't' || s === 'yes' || s === '1' || s === 'on' || s === 'oui';
  }
  return false;
}

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
  if (coerceManualBool(ouvert_manuellement)) {
    return { isOpen: true, isManuallyClosed: false, reason: 'manual_open', meta: {} };
  }
  if (coerceManualBool(ferme_manuellement)) {
    return { isOpen: false, isManuallyClosed: true, reason: 'manual_closed', meta: {} };
  }
  return { isOpen: true, isManuallyClosed: false, reason: 'open_not_manually_closed', meta: {} };
}

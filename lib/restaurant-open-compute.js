/**
 * Ouvert / fermé (site + API) : une seule règle.
 * Ouvert si ouvert_manuellement OU si le partenaire n’a pas activé la fermeture manuelle.
 * Fermé seulement si ferme_manuellement ET pas ouvert_manuellement.
 */

export const EMERGENCY_FORCE_OPEN_IDS = new Set([
  'd6725fe6-59ec-413a-b39b-ddb960824999',
  'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824',
]);

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
  const om = coerceManualBool(ouvert_manuellement);
  const fm = coerceManualBool(ferme_manuellement);
  const isOpen = om || !fm;
  return {
    isOpen,
    isManuallyClosed: false,
    reason: isOpen ? 'open' : 'closed_manual_flag',
    meta: {},
  };
}

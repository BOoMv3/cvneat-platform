/**
 * Affichage client ouvert / fermé.
 *
 * 1) Si l’API a posé `is_open_now` (bool / 0-1 / chaînes courantes) → on le suit (même moteur que le serveur).
 * 2) Sinon → computeRestaurantOpenState (flags uniquement).
 *
 * Sur l’accueil, une entrée de map `{}` ou sans `isOpen` boolean était prise pour valide → tout « fermé ».
 */

import { computeRestaurantOpenState, coerceManualBool } from './restaurant-open-compute';

/** Entrée `restaurantsOpenStatus[id]` : valide seulement si `isOpen` est un boolean. */
export function pickHomeOpenEntry(mapEntry) {
  if (mapEntry != null && typeof mapEntry === 'object' && typeof mapEntry.isOpen === 'boolean') {
    return mapEntry;
  }
  return null;
}

function interpretServerIsOpenNow(restaurant) {
  const v = restaurant?.is_open_now;
  if (v === true || v === 1) return { hit: true, open: true };
  if (v === false || v === 0) return { hit: true, open: false };
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', 't', '1', 'yes', 'on', 'oui'].includes(s)) return { hit: true, open: true };
    if (['false', 'f', '0', 'no', 'non'].includes(s)) return { hit: true, open: false };
  }
  return { hit: false, open: false };
}

export function getResolvedOpenFlags(restaurant) {
  if (!restaurant || typeof restaurant !== 'object') {
    return { isOpen: true, isManuallyClosed: false };
  }
  const ion = interpretServerIsOpenNow(restaurant);
  if (ion.hit) {
    const fm = coerceManualBool(restaurant.ferme_manuellement);
    const om = coerceManualBool(restaurant.ouvert_manuellement);
    return {
      isOpen: ion.open,
      isManuallyClosed: !ion.open && fm && !om,
    };
  }
  const st = computeRestaurantOpenState({
    id: restaurant?.id ?? null,
    horaires: restaurant?.horaires,
    ferme_manuellement: restaurant?.ferme_manuellement,
    ouvert_manuellement: restaurant?.ouvert_manuellement,
    now: new Date(),
  });
  return {
    isOpen: st.isOpen === true,
    isManuallyClosed: st.isManuallyClosed === true,
  };
}

/**
 * @param {{ restaurant: object, openStatusRow?: unknown, now?: Date }}
 */
export function resolveRestaurantOpenFromSources({ restaurant, openStatusRow: _ignored, now = new Date() }) {
  return getResolvedOpenFlags(restaurant);
}

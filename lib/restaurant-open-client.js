/**
 * Affichage client ouvert / fermé.
 *
 * Priorité à la paire atomique serveur `is_open_now` + `is_manually_closed` (même calcul,
 * pas de recomposition avec fm qui peut diverger d’un refresh à l’autre).
 * Sinon is_open_now seul : si ouvert → jamais « fermé manuellement » (évite flip refresh).
 * Puis compute sur les flags.
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

  const mc = restaurant.is_manually_closed;
  if (typeof restaurant.is_open_now === 'boolean' && typeof mc === 'boolean') {
    return {
      isOpen: restaurant.is_open_now,
      isManuallyClosed: mc,
    };
  }

  const ion = interpretServerIsOpenNow(restaurant);
  if (ion.hit) {
    if (ion.open) {
      return { isOpen: true, isManuallyClosed: false };
    }
    const fm = coerceManualBool(restaurant.ferme_manuellement);
    const om = coerceManualBool(restaurant.ouvert_manuellement);
    return {
      isOpen: false,
      isManuallyClosed: fm && !om,
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

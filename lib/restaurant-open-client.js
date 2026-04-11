/**
 * Affichage client : même moteur que le serveur (computeRestaurantOpenState).
 * Une seule règle : ouvert = ouvert_manuellement OU pas ferme_manuellement.
 */

import { computeRestaurantOpenState } from './restaurant-open-compute';

/** Entrée map accueil : isOpen / isManuallyClosed en boolean. */
export function pickHomeOpenEntry(mapEntry) {
  if (
    mapEntry != null &&
    typeof mapEntry === 'object' &&
    typeof mapEntry.isOpen === 'boolean' &&
    typeof mapEntry.isManuallyClosed === 'boolean'
  ) {
    return mapEntry;
  }
  return null;
}

export function getResolvedOpenFlags(restaurant) {
  if (!restaurant || typeof restaurant !== 'object') {
    return { isOpen: true, isManuallyClosed: false };
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
    isManuallyClosed: false,
  };
}

export function resolveRestaurantOpenFromSources({ restaurant, openStatusRow: _ignored, now = new Date() }) {
  return getResolvedOpenFlags(restaurant);
}

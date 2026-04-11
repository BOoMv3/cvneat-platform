/**
 * Affichage client : même moteur que le serveur (computeRestaurantOpenState).
 * Une seule règle : ouvert = ouvert_manuellement OU pas ferme_manuellement.
 */

import { computeRestaurantOpenState } from './restaurant-open-compute';

function coerceMapBool(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes' || s === 'on' || s === 'oui') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'off' || s === 'non') return false;
  }
  return null;
}

/** Entrée map accueil : tolère 0/1 ou chaînes (évite badge « Fermé » si la map n’est pas en boolean strict). */
export function pickHomeOpenEntry(mapEntry) {
  if (mapEntry == null || typeof mapEntry !== 'object') return null;
  const o = coerceMapBool(mapEntry.isOpen);
  const m = coerceMapBool(mapEntry.isManuallyClosed);
  if (o === null || m === null) return null;
  return {
    ...mapEntry,
    isOpen: o,
    isManuallyClosed: m,
  };
}

export function getResolvedOpenFlags(restaurant) {
  if (!restaurant || typeof restaurant !== 'object') {
    return { isOpen: true, isManuallyClosed: false };
  }
  const st = computeRestaurantOpenState({
    id: restaurant?.id ?? null,
    horaires: restaurant?.horaires,
    now: new Date(),
    restaurant,
  });
  return {
    isOpen: st.isOpen === true,
    isManuallyClosed: st.isManuallyClosed === true,
  };
}

export function resolveRestaurantOpenFromSources({ restaurant, openStatusRow: _ignored, now = new Date() }) {
  return getResolvedOpenFlags(restaurant);
}

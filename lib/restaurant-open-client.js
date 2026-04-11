/**
 * Affichage client : même moteur que le serveur (computeRestaurantOpenState).
 * Une seule règle : ouvert = ouvert_manuellement OU pas ferme_manuellement.
 */

import { computeRestaurantOpenState } from './restaurant-open-compute';

/** Quand l’API a déjà posé is_open_now / is_manually_closed : même affichage que le serveur, zéro recalcul parallèle. */
function openFlagsFromApiPayload(restaurant) {
  const ion = restaurant.is_open_now;
  if (ion === undefined || ion === null) return null;
  const truthy =
    ion === true ||
    ion === 1 ||
    ion === '1' ||
    (typeof ion === 'string' && ['true', 't', 'yes', 'oui', 'on'].includes(ion.trim().toLowerCase()));
  if (truthy) return { isOpen: true, isManuallyClosed: false };
  const falsy =
    ion === false ||
    ion === 0 ||
    ion === '0' ||
    (typeof ion === 'string' && ['false', 'f', 'no', 'non', 'off'].includes(ion.trim().toLowerCase()));
  if (!falsy) return null;
  const mc = restaurant.is_manually_closed;
  const isMc =
    mc === true ||
    mc === 1 ||
    mc === '1' ||
    (typeof mc === 'string' && ['true', 't', 'yes', 'oui', 'on'].includes(mc.trim().toLowerCase()));
  return { isOpen: false, isManuallyClosed: isMc };
}

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
  const fromApi = openFlagsFromApiPayload(restaurant);
  if (fromApi) return fromApi;
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

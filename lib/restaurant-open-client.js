/**
 * Affichage client ouvert / fermé.
 * Utilise la paire API `is_open_now` + `is_manually_closed` avec parsing tolérant
 * (bool, 0/1, chaînes) car le JSON ne garantit pas typeof === 'boolean'.
 */

import { computeRestaurantOpenState, coerceManualBool } from './restaurant-open-compute';

/** null = absent ou ambigu */
function parseApiBool(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', 't', 'yes', 'on', 'oui', '1'].includes(s)) return true;
    if (['false', 'f', 'no', 'non', '0'].includes(s)) return false;
  }
  return null;
}

/** Entrée map accueil : les deux champs doivent être des booleans explicites. */
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

  const o = parseApiBool(restaurant.is_open_now);
  const m = parseApiBool(restaurant.is_manually_closed);
  if (o !== null && m !== null) {
    if (o && m) {
      return { isOpen: true, isManuallyClosed: false };
    }
    return { isOpen: o, isManuallyClosed: m };
  }
  if (o === true) {
    return { isOpen: true, isManuallyClosed: false };
  }
  if (o === false) {
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

export function resolveRestaurantOpenFromSources({ restaurant, openStatusRow: _ignored, now = new Date() }) {
  return getResolvedOpenFlags(restaurant);
}

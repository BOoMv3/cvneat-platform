/**
 * Affichage client : même moteur que le serveur (normalizeRestaurantOpenFields).
 * Toujours recalculer depuis les flags présents sur l’objet — évite is_open_now périmé vs ferme_manuellement à jour.
 */

import { normalizeRestaurantOpenFields } from './restaurant-open-compute';

/** Même liste que EMERGENCY_FORCE_OPEN_IDS dans restaurant-open-compute (dupliquée : UI ouverte même si l’API ou un vieux chunk ne normalise pas). */
const EMERGENCY_OPEN_IDS_UI = new Set([
  'd6725fe6-59ec-413a-b39b-ddb960824999',
  'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824',
]);

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
/**
 * Accueil / tri : l’entrée `restaurantsOpenStatus` peut dire « fermé » si elle date d’une ancienne logique ;
 * les IDs urgence passent toujours en ouverts avant la map.
 */
export function resolveHomeOpenFromMap(restaurant, mapEntryMaybe) {
  const rid = restaurant?.id != null ? String(restaurant.id).trim() : '';
  if (rid && EMERGENCY_OPEN_IDS_UI.has(rid)) {
    return { isOpen: true, isManuallyClosed: false };
  }
  return pickHomeOpenEntry(mapEntryMaybe) ?? getResolvedOpenFlags(restaurant);
}

export function pickHomeOpenEntry(mapEntry) {
  if (mapEntry == null || typeof mapEntry !== 'object') return null;
  const o = coerceMapBool(mapEntry.isOpen);
  let m = coerceMapBool(mapEntry.isManuallyClosed);
  if (m === null && mapEntry.isManuallyClosed == null) m = false;
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
  const rid = restaurant.id != null ? String(restaurant.id).trim() : '';
  if (rid && EMERGENCY_OPEN_IDS_UI.has(rid)) {
    return { isOpen: true, isManuallyClosed: false };
  }
  const n = normalizeRestaurantOpenFields(restaurant);
  return {
    isOpen: n.is_open_now === true,
    isManuallyClosed: n.is_manually_closed === true,
  };
}

export function resolveRestaurantOpenFromSources({ restaurant, openStatusRow: _ignored, now = new Date() }) {
  if (!restaurant || typeof restaurant !== 'object') {
    return { isOpen: true, isManuallyClosed: false };
  }
  const rid = restaurant.id != null ? String(restaurant.id).trim() : '';
  if (rid && EMERGENCY_OPEN_IDS_UI.has(rid)) {
    return { isOpen: true, isManuallyClosed: false };
  }
  const n = normalizeRestaurantOpenFields(restaurant, now);
  return {
    isOpen: n.is_open_now === true,
    isManuallyClosed: n.is_manually_closed === true,
  };
}

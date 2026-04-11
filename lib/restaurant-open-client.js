/**
 * Affichage ouvert / fermé côté client.
 *
 * Ordre (une seule vérité par instantané JSON) :
 * 1) Flags manuels sur le même objet que le GET (om puis fm, comme computeRestaurantOpenState).
 * 2) is_open_now sur ce même objet (déjà calculé par GET /api/restaurants et GET /api/restaurants/[id]).
 * 3) Ligne batch open-status (si is_open_now absent, ex. vieux cache).
 * 4) computeRestaurantOpenState(horaires + flags) en dernier recours.
 *
 * NEXT_PUBLIC_CUSTOMER_STATUS_MANUAL_ONLY=1 : uniquement ouvert_manuellement (ignore is_open_now / batch / compute).
 */

import { computeRestaurantOpenState } from './restaurant-open-compute';

export function pickOpenStatusRow(map, id) {
  if (!map || id == null) return null;
  const s = String(id).trim();
  if (map[s] != null) return map[s];
  if (map[id] != null) return map[id];
  const lower = s.toLowerCase();
  const k = Object.keys(map).find((key) => String(key).trim().toLowerCase() === lower);
  return k != null ? map[k] : null;
}

const toBool = (v) =>
  v === true ||
  v === 1 ||
  v === '1' ||
  (typeof v === 'string' && v.trim().toLowerCase() === 'true');

const isExplicitOpenNow = (v) =>
  v === true || v === 1 || (typeof v === 'string' && v.trim().toLowerCase() === 'true');

const isExplicitClosedNow = (v) =>
  v === false ||
  v === 0 ||
  (typeof v === 'string' && ['false', '0'].includes(v.trim().toLowerCase()));

const manualOnlyClient =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CUSTOMER_STATUS_MANUAL_ONLY === '1';

/**
 * @param {{ restaurant: object, openStatusRow: { isOpen?: boolean, isManuallyClosed?: boolean } | null, now?: Date }}
 */
export function resolveRestaurantOpenFromSources({ restaurant, openStatusRow, now = new Date() }) {
  if (manualOnlyClient) {
    if (toBool(restaurant?.ouvert_manuellement)) {
      return { isOpen: true, isManuallyClosed: false };
    }
    return { isOpen: false, isManuallyClosed: false };
  }

  if (restaurant && typeof restaurant === 'object') {
    const om = toBool(restaurant.ouvert_manuellement);
    const fm = toBool(restaurant.ferme_manuellement);
    if (om) return { isOpen: true, isManuallyClosed: false };
    if (fm) return { isOpen: false, isManuallyClosed: true };
    const ion = restaurant.is_open_now;
    if (isExplicitOpenNow(ion)) return { isOpen: true, isManuallyClosed: false };
    if (isExplicitClosedNow(ion)) return { isOpen: false, isManuallyClosed: false };
  }

  const serverRow =
    openStatusRow && typeof openStatusRow === 'object' ? openStatusRow : null;
  if (serverRow) {
    if (serverRow.isManuallyClosed === true) {
      return { isOpen: false, isManuallyClosed: true };
    }
    return { isOpen: serverRow.isOpen === true, isManuallyClosed: false };
  }

  const st = computeRestaurantOpenState({
    id: restaurant?.id ?? null,
    horaires: restaurant?.horaires,
    ferme_manuellement: restaurant?.ferme_manuellement,
    ouvert_manuellement: restaurant?.ouvert_manuellement,
    now,
  });
  return {
    isOpen: st.isOpen === true,
    isManuallyClosed: st.isManuallyClosed === true,
  };
}

/**
 * Statut ouvert / fermé côté client — modèle simple :
 * 1) Si une ligne POST /api/restaurants/open-status est fournie → on l’affiche telle quelle (vérité serveur).
 * 2) Sinon → même calcul que le serveur via computeRestaurantOpenState (horaires + flags), pas de mélange
 *    avec is_open_now ni sessionStorage (sources qui divergeient et provoquaient ouvert puis fermé).
 *
 * Mode secours : NEXT_PUBLIC_CUSTOMER_STATUS_MANUAL_ONLY=1 — sans ligne open-status : ouvert seulement si ouvert_manuellement.
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

const manualOnlyClient =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CUSTOMER_STATUS_MANUAL_ONLY === '1';

/**
 * @param {{ restaurant: object, openStatusRow: { isOpen?: boolean, isManuallyClosed?: boolean } | null, now?: Date }}
 */
export function resolveRestaurantOpenFromSources({ restaurant, openStatusRow, now = new Date() }) {
  const serverRow =
    !manualOnlyClient && openStatusRow && typeof openStatusRow === 'object'
      ? openStatusRow
      : null;

  if (serverRow) {
    if (serverRow.isManuallyClosed === true) {
      return { isOpen: false, isManuallyClosed: true };
    }
    return { isOpen: serverRow.isOpen === true, isManuallyClosed: false };
  }

  if (manualOnlyClient) {
    if (toBool(restaurant?.ouvert_manuellement)) {
      return { isOpen: true, isManuallyClosed: false };
    }
    return { isOpen: false, isManuallyClosed: false };
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

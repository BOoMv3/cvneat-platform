/**
 * Résolution unique ouvert/fermé côté client — alignée accueil ↔ fiche restaurant (web).
 * Priorité: ferme_manuellement > ouvert_manuellement > ligne open-status > is_open_now (API liste/détail).
 */

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

/**
 * @param {{ restaurant: object, openStatusRow: { isOpen?: boolean, isManuallyClosed?: boolean } | null }}
 */
export function resolveRestaurantOpenFromSources({ restaurant, openStatusRow }) {
  const fm = toBool(restaurant?.ferme_manuellement);
  if (fm) {
    return { isOpen: false, isManuallyClosed: true };
  }

  const om = toBool(restaurant?.ouvert_manuellement);
  if (om) {
    return { isOpen: true, isManuallyClosed: false };
  }

  if (openStatusRow && typeof openStatusRow === 'object') {
    const mc = openStatusRow.isManuallyClosed === true;
    if (mc) {
      return { isOpen: false, isManuallyClosed: true };
    }
    return {
      isOpen: openStatusRow.isOpen === true,
      isManuallyClosed: false,
    };
  }

  const rowOpen =
    restaurant?.is_open_now === true ||
    restaurant?.is_open_now === 1 ||
    restaurant?.is_open_now === 'true';

  return { isOpen: rowOpen, isManuallyClosed: false };
}

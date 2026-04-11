/**
 * Résolution unique ouvert/fermé côté client — alignée accueil ↔ fiche restaurant (web).
 *
 * Si `open-status` (ligne serveur) est présent : on s’y fie en priorité — il reflète la DB au moment
 * de l’appel (flags + horaires). Sinon on retombe sur les champs du restaurant (liste/détail),
 * puis `is_open_now`. Évite la fiche « fermé manuellement » avec ref React périmée alors que
 * l’accueil vient de recharger des données à jour.
 *
 * Mode secours : NEXT_PUBLIC_CUSTOMER_STATUS_MANUAL_ONLY=1 — ignoré quand une ligne open-status
 * est fournie (le batch serveur reste la vérité affichage web par défaut).
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

const manualOnlyClient =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_CUSTOMER_STATUS_MANUAL_ONLY === '1';

/**
 * @param {{ restaurant: object, openStatusRow: { isOpen?: boolean, isManuallyClosed?: boolean } | null }}
 */
export function resolveRestaurantOpenFromSources({ restaurant, openStatusRow }) {
  const serverRow =
    !manualOnlyClient && openStatusRow && typeof openStatusRow === 'object'
      ? openStatusRow
      : null;

  if (serverRow) {
    if (serverRow.isManuallyClosed === true) {
      return { isOpen: false, isManuallyClosed: true };
    }
    return {
      isOpen: serverRow.isOpen === true,
      isManuallyClosed: false,
    };
  }

  const fm = toBool(restaurant?.ferme_manuellement);
  if (fm) {
    return { isOpen: false, isManuallyClosed: true };
  }

  const om = toBool(restaurant?.ouvert_manuellement);
  if (om) {
    return { isOpen: true, isManuallyClosed: false };
  }

  if (manualOnlyClient) {
    return { isOpen: false, isManuallyClosed: false };
  }

  const rowOpen =
    restaurant?.is_open_now === true ||
    restaurant?.is_open_now === 1 ||
    restaurant?.is_open_now === 'true';

  return { isOpen: rowOpen, isManuallyClosed: false };
}

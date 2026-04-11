export const HOME_OPEN_SNAPSHOT_PREFIX = 'cvneat_home_open_';
/** Court : uniquement pour l’alignement accueil → fiche juste après un clic (évite d’écraser un vrai passage fermé). */
export const HOME_OPEN_SNAPSHOT_MAX_MS = 45_000;

export function writeRestaurantOpenSnapshotForNavigation(restaurantId, { isOpen, isManuallyClosed }) {
  if (typeof window === 'undefined' || restaurantId == null || restaurantId === '') return;
  const key = `${HOME_OPEN_SNAPSHOT_PREFIX}${String(restaurantId).trim()}`;
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        isOpen: isOpen === true,
        isManuallyClosed: isManuallyClosed === true,
        at: Date.now(),
      })
    );
  } catch {
    /* quota / private mode */
  }
}

export function readRestaurantOpenSnapshotForNavigation(restaurantId) {
  if (typeof window === 'undefined' || restaurantId == null || restaurantId === '') return null;
  const key = `${HOME_OPEN_SNAPSHOT_PREFIX}${String(restaurantId).trim()}`;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (Date.now() - (o.at || 0) > HOME_OPEN_SNAPSHOT_MAX_MS) return null;
    return {
      isOpen: o.isOpen === true,
      isManuallyClosed: o.isManuallyClosed === true,
    };
  } catch {
    return null;
  }
}

export function consumeRestaurantOpenSnapshot(restaurantId) {
  if (typeof window === 'undefined' || restaurantId == null || restaurantId === '') return;
  try {
    window.sessionStorage.removeItem(`${HOME_OPEN_SNAPSHOT_PREFIX}${String(restaurantId).trim()}`);
  } catch {
    /* ignore */
  }
}

/**
 * Après un clic depuis l’accueil : si la carte était « ouvert » et la fiche calcule « fermé »
 * sans fermeture manuelle serveur, on réaligne sur l’accueil (une seule fois / fenêtre courte).
 */
export function alignDetailResolvedWithHomeSnapshot(restaurantId, resolved) {
  const snap = readRestaurantOpenSnapshotForNavigation(restaurantId);
  if (!snap || !resolved || typeof resolved !== 'object') return resolved;
  if (resolved.isManuallyClosed === true) return resolved;
  if (snap.isManuallyClosed === true) {
    return { isOpen: false, isManuallyClosed: true };
  }
  if (snap.isOpen === true && resolved.isOpen !== true) {
    return { isOpen: true, isManuallyClosed: false };
  }
  return resolved;
}

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
    const serverOpen = serverRow.isOpen === true;
    const apiOpen =
      restaurant?.is_open_now === true ||
      restaurant?.is_open_now === 1 ||
      restaurant?.is_open_now === 'true';
    // OR : si GET liste/détail a calculé ouvert mais la ligne batch diverge (edge), on évite « toujours fermé ».
    return {
      isOpen: serverOpen || apiOpen,
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

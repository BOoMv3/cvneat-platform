/**
 * Ouvert / fermé (affichage + API) : uniquement les flags manuels — les horaires ne ferment pas le restaurant.
 * Règle : ouvert si ouvert_manuellement OU si le partenaire n’a pas mis « fermé manuellement ».
 * Conflit en base (ferme + ouvert tous deux à true) : on considère ouvert pour ne pas bloquer le commerce à tort.
 */

export function coerceManualBool(v) {
  if (v == null || v === '') return false;
  if (v === false || v === 0 || v === '0') return false;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'false' || s === 'f' || s === 'no' || s === 'non' || s === 'off' || s === '0') return false;
    if (s === 'true' || s === 't' || s === 'yes' || s === '1' || s === 'on' || s === 'oui') return true;
    return false;
  }
  if (v === true || v === 1 || v === '1') return true;
  return false;
}

/** Lit les colonnes manuelles quelle que soit la casse / alias (payloads mixtes). */
export function readManualFlags(restaurantLike) {
  if (!restaurantLike || typeof restaurantLike !== 'object') {
    return { ferme_manuellement: undefined, ouvert_manuellement: undefined };
  }
  const fm =
    restaurantLike.ferme_manuellement ??
    restaurantLike.fermeManuellement ??
    restaurantLike.manual_close ??
    restaurantLike.manualClose;
  const om =
    restaurantLike.ouvert_manuellement ??
    restaurantLike.ouvertManuellement ??
    restaurantLike.manual_open ??
    restaurantLike.manualOpen;
  return { ferme_manuellement: fm, ouvert_manuellement: om };
}

export function computeRestaurantOpenState({
  ferme_manuellement,
  ouvert_manuellement,
  restaurant: restaurantLike = null,
}) {
  const fromRow = restaurantLike != null ? readManualFlags(restaurantLike) : {};
  const fmRaw = ferme_manuellement !== undefined ? ferme_manuellement : fromRow.ferme_manuellement;
  const omRaw = ouvert_manuellement !== undefined ? ouvert_manuellement : fromRow.ouvert_manuellement;
  let om = coerceManualBool(omRaw);
  let fm = coerceManualBool(fmRaw);
  if (fm && om) {
    fm = false;
    om = false;
  }
  const isOpen = om || !fm;
  return {
    isOpen,
    isManuallyClosed: fm && !om,
    reason: isOpen ? 'open' : 'closed_manual_flag',
    meta: {},
  };
}

/**
 * Champs ouverture « canoniques » pour une ligne restaurant (API, accueil).
 * Uniquement manuel : pas d’inférence sur les horaires.
 */
export function normalizeRestaurantOpenFields(restaurantLike, _now = new Date()) {
  if (!restaurantLike || typeof restaurantLike !== 'object') {
    return {
      ferme_manuellement: false,
      ouvert_manuellement: false,
      is_open_now: true,
      is_manually_closed: false,
    };
  }

  const flags = readManualFlags(restaurantLike);
  let fm = coerceManualBool(flags.ferme_manuellement);
  let om = coerceManualBool(flags.ouvert_manuellement);

  if (fm && om) {
    fm = false;
    om = false;
  }

  const st = computeRestaurantOpenState({
    ferme_manuellement: fm,
    ouvert_manuellement: om,
  });
  return {
    ferme_manuellement: fm,
    ouvert_manuellement: om,
    is_open_now: st.isOpen === true,
    is_manually_closed: st.isManuallyClosed === true,
  };
}

/** Horodatage « logique » d’une ligne restaurant pour comparer deux réponses API (anti réponse lente / obsolète). */
export function restaurantRowRecencyMs(row) {
  if (!row || typeof row !== 'object') return 0;
  for (const k of ['manual_status_updated_at', 'updated_at']) {
    const raw = row[k];
    if (raw == null || raw === '') continue;
    const t = new Date(raw).getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

/** true si `next` doit remplacer `prev` (évite flip ouvert/fermé quand une requête ancienne finit après une récente). */
export function shouldApplyRestaurantRowUpdate(prev, next) {
  if (!next || typeof next !== 'object') return false;
  if (!prev || typeof prev !== 'object') return true;
  const n = restaurantRowRecencyMs(next);
  const p = restaurantRowRecencyMs(prev);
  if (n > p) return true;
  if (n < p) return false;
  return (
    prev.ferme_manuellement !== next.ferme_manuellement ||
    prev.ouvert_manuellement !== next.ouvert_manuellement ||
    prev.is_open_now !== next.is_open_now ||
    prev.is_manually_closed !== next.is_manually_closed
  );
}

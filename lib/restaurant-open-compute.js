/**
 * Ouvert / fermé (site + API) : une seule règle.
 * Ouvert si ouvert_manuellement OU si le partenaire n’a pas activé la fermeture manuelle.
 * Fermé seulement si ferme_manuellement ET pas ouvert_manuellement.
 */

export const EMERGENCY_FORCE_OPEN_IDS = new Set([
  'd6725fe6-59ec-413a-b39b-ddb960824999',
  'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824',
]);

/** Dernier rempart côté routes API : payload client cohérent même si une vieille couche oublie la normalisation. */
export function applyEmergencyCustomerPayload(row) {
  if (!row || typeof row !== 'object') return row;
  const rid = row.id != null ? String(row.id).trim() : '';
  if (!rid || !EMERGENCY_FORCE_OPEN_IDS.has(rid)) return row;
  return {
    ...row,
    ferme_manuellement: false,
    ouvert_manuellement: false,
    is_open_now: true,
    is_manually_closed: false,
  };
}

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
  id = null,
  horaires,
  ferme_manuellement,
  ouvert_manuellement,
  now = new Date(),
  restaurant: restaurantLike = null,
}) {
  if (id != null && EMERGENCY_FORCE_OPEN_IDS.has(String(id))) {
    return { isOpen: true, isManuallyClosed: false, reason: 'emergency_force_open', meta: {} };
  }
  const fromRow = restaurantLike != null ? readManualFlags(restaurantLike) : {};
  const fmRaw = ferme_manuellement !== undefined ? ferme_manuellement : fromRow.ferme_manuellement;
  const omRaw = ouvert_manuellement !== undefined ? ouvert_manuellement : fromRow.ouvert_manuellement;
  const om = coerceManualBool(omRaw);
  const fm = coerceManualBool(fmRaw);
  const isOpen = om || !fm;
  return {
    isOpen,
    isManuallyClosed: fm && !om,
    reason: isOpen ? 'open' : 'closed_manual_flag',
    meta: {},
  };
}

/**
 * Champs ouverture « canoniques » pour une ligne restaurant (API, accueil, validate).
 * Toujours : booleans ferme/ouvert + is_open_now / is_manually_closed alignés sur computeRestaurantOpenState.
 */
export function normalizeRestaurantOpenFields(restaurantLike, now = new Date()) {
  if (!restaurantLike || typeof restaurantLike !== 'object') {
    return {
      ferme_manuellement: false,
      ouvert_manuellement: false,
      is_open_now: true,
      is_manually_closed: false,
    };
  }
  const rid = restaurantLike.id != null ? String(restaurantLike.id).trim() : '';
  const flags = readManualFlags(restaurantLike);
  let fm = coerceManualBool(flags.ferme_manuellement);
  let om = coerceManualBool(flags.ouvert_manuellement);

  // Même règle que migration 20260411190000 : impossible fm+om vrais tous les deux pour le calcul client/API.
  if (fm && om) {
    om = false;
  }

  // Liste d’urgence : payload client toujours « ouvert » même si la ligne BDD est restée bloquée (prod / partenaire).
  if (rid && EMERGENCY_FORCE_OPEN_IDS.has(rid)) {
    return {
      ferme_manuellement: false,
      ouvert_manuellement: false,
      is_open_now: true,
      is_manually_closed: false,
    };
  }

  const st = computeRestaurantOpenState({
    id: restaurantLike.id ?? null,
    horaires: restaurantLike.horaires,
    ferme_manuellement: fm,
    ouvert_manuellement: om,
    now,
  });
  return {
    ferme_manuellement: fm,
    ouvert_manuellement: om,
    is_open_now: st.isOpen === true,
    is_manually_closed: st.isManuallyClosed === true,
  };
}

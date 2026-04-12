/**
 * Ouvert / fermé (affichage + API) : horaires (Europe/Paris) + flags manuels.
 * `ferme_manuellement` en base force la fermeture (hors `ouvert_manuellement`) — ex. restos fermés admin (O’Saona Tea).
 * On n’affiche pas le libellé « fermé manuellement » côté client ; `is_open_now` reste la seule source badge ouvert/fermé.
 */

import { isRestaurantHardClosed } from './restaurant-force-closed';
import { isRestaurantOpenNowFromHoraires } from './restaurant-horaires-paris';

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

/** Colonnes possibles pour les horaires (selon imports / vues). */
function resolveHorairesColumn(restaurantLike) {
  if (!restaurantLike || typeof restaurantLike !== 'object') return null;
  const raw =
    restaurantLike.horaires ??
    restaurantLike.opening_hours ??
    restaurantLike.openingHours;
  return raw == null || raw === '' ? null : raw;
}

/**
 * Restaurant ouvert « maintenant » d’après les plages du jour (même règles que l’accueil : clés FR/EN, debut/fin, tableaux lundi=0, etc.).
 */
export function isOpenNowFromHoraires(horairesRaw, now = new Date()) {
  if (horairesRaw == null || horairesRaw === '') return false;
  return isRestaurantOpenNowFromHoraires(horairesRaw, now);
}

/** @deprecated conservé pour scripts ; l’app utilise normalizeRestaurantOpenFields + horaires. */
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
    isManuallyClosed: false,
    reason: isOpen ? 'open' : 'closed_manual_flag',
    meta: {},
  };
}

/**
 * Champs ouverture pour API / accueil / fiche : horaires + flags manuels.
 * `ferme_manuellement` / `ouvert_manuellement` sont renvoyés tels qu’interprétés (bool) pour que les
 * re-normalisations (ex. getResolvedOpenFlags) ne « perdent » pas une fermeture manuelle.
 */
export function normalizeRestaurantOpenFields(restaurantLike, now = new Date()) {
  if (!restaurantLike || typeof restaurantLike !== 'object') {
    return {
      ferme_manuellement: false,
      ouvert_manuellement: false,
      is_open_now: false,
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

  // ouvert_manuellement : ouvert malgré tout. ferme_manuellement : fermé malgré les horaires (admin / scripts).
  const scheduleOpen = isOpenNowFromHoraires(resolveHorairesColumn(restaurantLike), now);
  let isOpenNow = om === true || (!fm && scheduleOpen);
  // Fermeture dure (liste code) — ex. O’Saona Tea si la BDD ne reflète pas la fermeture.
  if (isRestaurantHardClosed(restaurantLike) && !om) {
    isOpenNow = false;
  }

  // Conserver le booléen réel : sinon tout objet passé deux fois dans normalize (ex. getResolvedOpenFlags)
  // « oublie » la fermeture manuelle et recalcule is_open_now comme ouvert d’après les seuls horaires.
  return {
    ferme_manuellement: fm,
    ouvert_manuellement: om,
    is_open_now: isOpenNow,
    is_manually_closed: fm === true,
  };
}

/**
 * Après `normalizeRestaurantOpenFields`, le payload public garde `ferme_manuellement: false`.
 * Pour les dashboards (partenaire, etc.) qui affichent / togglent la fermeture manuelle,
 * recoller le booléen issu des colonnes brutes (`readManualFlags`).
 */
export function mergeOpenFieldsPreservingManualClose(restaurantLike, openNorm) {
  if (!restaurantLike || typeof restaurantLike !== 'object') {
    return openNorm && typeof openNorm === 'object' ? { ...openNorm } : {};
  }
  const flags = readManualFlags(restaurantLike);
  const fm = coerceManualBool(flags.ferme_manuellement);
  return {
    ...restaurantLike,
    ...(openNorm && typeof openNorm === 'object' ? openNorm : {}),
    ferme_manuellement: fm,
  };
}

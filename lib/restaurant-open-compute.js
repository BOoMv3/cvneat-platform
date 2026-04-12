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

/**
 * Restaurant ouvert « maintenant » d’après les plages du jour (même règles que l’accueil : clés FR/EN, debut/fin, tableaux lundi=0, etc.).
 */
export function isOpenNowFromHoraires(horairesRaw, now = new Date()) {
  if (!horairesRaw) return false;
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
 * `ferme_manuellement` en base est pris en compte pour `is_open_now` mais renvoyé false dans le payload (évite d’exposer l’ancien champ tel quel).
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
  const scheduleOpen = isOpenNowFromHoraires(restaurantLike.horaires, now);
  let isOpenNow = om === true || (!fm && scheduleOpen);
  // Fermeture dure (liste code) — ex. O’Saona Tea si la BDD ne reflète pas la fermeture.
  if (isRestaurantHardClosed(restaurantLike) && !om) {
    isOpenNow = false;
  }

  return {
    ferme_manuellement: false,
    ouvert_manuellement: om,
    is_open_now: isOpenNow,
    is_manually_closed: false,
  };
}

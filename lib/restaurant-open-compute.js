/**
 * Ouvert / fermé (affichage + API) : horaires (Europe/Paris) + option « ouvert manuellement » pour forcer l’ouverture.
 * La colonne `ferme_manuellement` n’est plus utilisée pour l’affichage client ni pour les badges (plus de « fermé manuellement »).
 */

import {
  coerceHorairesObject,
  hasExplicitScheduleForDay,
  isRestaurantOpenNowFromHoraires,
} from './restaurant-horaires-paris';
import {
  hasDailyOpenColumns,
  isDailyOpenAllowed,
  isDailyOpenConfirmed,
  isDailyOpenDeclinedToday,
  shouldPromptDailyOpen,
} from './restaurant-daily-open';

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

function hasHorairesConfigured(horairesRaw) {
  const h = coerceHorairesObject(horairesRaw);
  if (!h || typeof h !== 'object') return false;
  if (Array.isArray(h)) return h.length > 0;
  return Object.keys(h).length > 0;
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
 * Champs ouverture pour API / accueil / fiche : horaires + confirmation quotidienne partenaire.
 * Fermeture manuelle (ferme_manuellement) = fermé immédiatement (fin de service anticipée).
 */
export function normalizeRestaurantOpenFields(restaurantLike, now = new Date()) {
  if (!restaurantLike || typeof restaurantLike !== 'object') {
    return {
      ferme_manuellement: false,
      ouvert_manuellement: false,
      is_open_now: false,
      is_manually_closed: false,
      daily_open_confirmed: false,
      needs_daily_open_confirmation: false,
    };
  }

  const flags = readManualFlags(restaurantLike);
  let fm = coerceManualBool(flags.ferme_manuellement);
  const om = coerceManualBool(flags.ouvert_manuellement);
  if (fm && om) fm = false;

  const hasH = hasHorairesConfigured(restaurantLike.horaires);
  const hoursOpen = hasH ? isRestaurantOpenNowFromHoraires(restaurantLike.horaires, now) : false;
  const dailyAllowed = isDailyOpenAllowed(restaurantLike, now);
  const dailyConfirmed = isDailyOpenConfirmed(restaurantLike, now);
  const dailyDeclined = isDailyOpenDeclinedToday(restaurantLike, now);
  const needsConfirm = hasDailyOpenColumns(restaurantLike)
    ? shouldPromptDailyOpen(restaurantLike, now)
    : false;

  const isOpenNow = fm ? false : dailyAllowed && hoursOpen;

  return {
    ferme_manuellement: fm,
    ouvert_manuellement: false,
    is_open_now: isOpenNow,
    is_manually_closed: fm,
    daily_open_confirmed: dailyConfirmed,
    daily_open_declined_today: dailyDeclined,
    needs_daily_open_confirmation: needsConfirm,
  };
}

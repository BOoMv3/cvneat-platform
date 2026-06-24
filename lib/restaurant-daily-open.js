/**
 * Confirmation quotidienne d'ouverture : le partenaire doit confirmer chaque jour
 * qu'il est ouvert ; sans confirmation, le restaurant reste fermé (horaires respectés ensuite).
 */

import {
  getHeuresJourForDate,
  hasExplicitScheduleForDay,
  parseTimeToMinutes,
} from './restaurant-horaires-paris';

/** Date calendaire YYYY-MM-DD en Europe/Paris. */
export function toParisDateString(refDate = new Date()) {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(refDate);
}

/** Colonnes présentes (migration appliquée) — sinon on garde l'ancien comportement. */
export function hasDailyOpenColumns(restaurantLike) {
  if (!restaurantLike || typeof restaurantLike !== 'object') return false;
  return (
    Object.prototype.hasOwnProperty.call(restaurantLike, 'daily_open_confirmed_at') ||
    Object.prototype.hasOwnProperty.call(restaurantLike, 'daily_open_declined_date')
  );
}

export function isDailyOpenConfirmed(restaurantLike, now = new Date()) {
  if (!hasDailyOpenColumns(restaurantLike)) return true;
  const at = restaurantLike?.daily_open_confirmed_at;
  if (!at) return false;
  const confirmedDate = toParisDateString(new Date(at));
  return confirmedDate === toParisDateString(now);
}

export function isDailyOpenDeclinedToday(restaurantLike, now = new Date()) {
  if (!hasDailyOpenColumns(restaurantLike)) return false;
  const d = restaurantLike?.daily_open_declined_date;
  if (!d) return false;
  return String(d).slice(0, 10) === toParisDateString(now);
}

/** Jour prévu ouvert dans les horaires (plages ou paire ouverture/fermeture). */
export function isScheduledServiceDay(horairesRaw, now = new Date()) {
  const day = getHeuresJourForDate(horairesRaw, now);
  if (!day || day.is_closed === true || day.ferme === true) return false;
  return hasExplicitScheduleForDay(horairesRaw, now);
}

/** Partenaire a confirmé aujourd'hui et n'a pas décliné. */
export function isDailyOpenAllowed(restaurantLike, now = new Date()) {
  if (!isScheduledServiceDay(restaurantLike?.horaires, now)) return false;
  if (!hasDailyOpenColumns(restaurantLike)) return true;
  if (isDailyOpenDeclinedToday(restaurantLike, now)) return false;
  return isDailyOpenConfirmed(restaurantLike, now);
}

/** Afficher la popup de confirmation au partenaire. */
export function shouldPromptDailyOpen(restaurantLike, now = new Date()) {
  if (!hasDailyOpenColumns(restaurantLike)) return false;
  if (!isScheduledServiceDay(restaurantLike?.horaires, now)) return false;
  if (isDailyOpenConfirmed(restaurantLike, now)) return false;
  if (isDailyOpenDeclinedToday(restaurantLike, now)) return false;
  return true;
}

export function getFirstOpeningMinutesForDay(horairesRaw, refDate = new Date()) {
  const day = getHeuresJourForDate(horairesRaw, refDate);
  if (!day || day.is_closed === true) return null;
  const times = [];
  if (Array.isArray(day.plages) && day.plages.length > 0) {
    for (const plage of day.plages) {
      const t = parseTimeToMinutes(plage?.ouverture || plage?.debut);
      if (t !== null) times.push(t);
    }
  } else {
    const t = parseTimeToMinutes(day.ouverture || day.debut);
    if (t !== null) times.push(t);
  }
  if (times.length === 0) return null;
  return Math.min(...times);
}

export function formatMinutesParisLabel(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return null;
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

export function getTodayFirstOpeningLabel(horairesRaw, refDate = new Date()) {
  return formatMinutesParisLabel(getFirstOpeningMinutesForDay(horairesRaw, refDate));
}

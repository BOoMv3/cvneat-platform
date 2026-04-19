/**
 * Résolution des horaires restaurant (Europe/Paris) : mêmes règles que l’accueil (clés FR/EN, indices, debut/fin, JSON imbriqué).
 * Centralisé pour que is_open_now (API / fiche) ne diverge plus du libellé « horaires du jour ».
 */

const DAY_NAMES_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const DAY_NAMES_EN = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** JSON éventuellement double-encodé ou { horaires: { ... } }. */
export function coerceHorairesObject(horairesRaw) {
  let h = horairesRaw;
  for (let i = 0; i < 3; i += 1) {
    if (typeof h !== 'string') break;
    const s = h.trim();
    if (!s) break;
    try {
      h = JSON.parse(s);
    } catch {
      break;
    }
  }
  if (h && typeof h === 'object' && !Array.isArray(h) && h.horaires && typeof h.horaires === 'object') {
    return h.horaires;
  }
  return h;
}

/** Heure + jour calendaire (0=dim … 6=sam) + nom du jour FR en minuscules, fuseau Europe/Paris. */
export function getParisNow(refDate = new Date()) {
  const now = refDate;
  try {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'long',
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const weekday = (parts.find((p) => p.type === 'weekday')?.value || '').toLowerCase();
    const dayIndex = DAY_NAMES_FR.indexOf(weekday);
    return {
      hour,
      minute,
      dayIndex: dayIndex >= 0 ? dayIndex : now.getDay(),
      todayName: weekday || DAY_NAMES_FR[now.getDay()],
      dayNamesFr: DAY_NAMES_FR,
    };
  } catch (_) {
    const dayIndex = now.getDay();
    return {
      hour: now.getHours(),
      minute: now.getMinutes(),
      dayIndex,
      todayName: DAY_NAMES_FR[dayIndex] || 'lundi',
      dayNamesFr: DAY_NAMES_FR,
    };
  }
}

/** Parse "HH:MM" ou "HHhMM" en minutes depuis minuit. 00:00 en fermeture = 24h (1440). */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2})[h:](\d{2})$/);
  const h = match ? parseInt(match[1], 10) : parseInt(trimmed.split(':')[0], 10);
  const m = match ? parseInt(match[2], 10) : parseInt(trimmed.split(':')[1] || '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 24 || m < 0 || m > 59) return null;
  let tot = h * 60 + m;
  if (tot === 0 && h === 0 && m === 0) tot = 1440;
  if (trimmed === '24:00' || trimmed === '24h00') tot = 1440;
  return tot;
}

/**
 * Entrée horaires pour le jour calendaire `refDate` (Paris).
 */
export function getHeuresJourForDate(horairesInput, refDate = new Date()) {
  let horaires = horairesInput;
  if (typeof horaires === 'string') {
    try {
      horaires = JSON.parse(horaires);
    } catch {
      return null;
    }
  }
  horaires = coerceHorairesObject(horaires);
  if (!horaires || typeof horaires !== 'object') return null;

  const { dayIndex, todayName } = getParisNow(refDate);
  const todayEn = DAY_NAMES_EN[dayIndex] || 'monday';

  if (Array.isArray(horaires) && horaires.length >= 7) {
    const dayNamesMonday0 = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const idxMonday0 = dayNamesMonday0.indexOf(todayName);
    if (idxMonday0 >= 0 && horaires[idxMonday0] != null) return horaires[idxMonday0];
  }

  const candidates = new Set();
  const add = (v) => {
    if (v != null && String(v).trim() !== '') candidates.add(String(v));
  };

  add(todayName);
  add(todayName.charAt(0).toUpperCase() + todayName.slice(1));
  add(todayName.toUpperCase());
  add(todayEn);
  add(todayEn.charAt(0).toUpperCase() + todayEn.slice(1));
  add(todayEn.toUpperCase());
  add(todayEn.slice(0, 3));
  add(todayEn.slice(0, 3).toUpperCase());
  add(todayName.slice(0, 3));
  add(todayName.slice(0, 3).toUpperCase());
  add(dayIndex);
  add(String(dayIndex));

  for (const key of candidates) {
    if (horaires[key] != null) return horaires[key];
  }
  if (dayIndex >= 0 && horaires[dayIndex] != null) return horaires[dayIndex];

  const candidatesLower = new Set(Array.from(candidates).map((k) => String(k).trim().toLowerCase()));
  for (const k of Object.keys(horaires)) {
    if (candidatesLower.has(String(k).trim().toLowerCase())) return horaires[k];
  }
  return null;
}

export function getHeuresJourForToday(horaires) {
  return getHeuresJourForDate(horaires, new Date());
}

/**
 * Ouvert à l’instant `refDate` (heure Paris) selon la plage du jour.
 */
export function isRestaurantOpenNowFromHoraires(horairesRaw, refDate = new Date()) {
  const day = getHeuresJourForDate(horairesRaw, refDate);
  if (!day || day.is_closed === true) return false;

  const { hour, minute } = getParisNow(refDate);
  const current = hour * 60 + minute;

  const hasPlages = Array.isArray(day.plages) && day.plages.length > 0;
  const hasSingle =
    (day.ouverture || day.debut) &&
    (day.fermeture || day.fin);

  if (
    (day.ouvert === true || day.ouvert === 'true' || day.ouvert === 1) &&
    !hasPlages &&
    !hasSingle
  ) {
    return true;
  }

  if (hasPlages) {
    return day.plages.some((plage) => {
      const start = parseTimeToMinutes(plage?.ouverture || plage?.debut);
      const end = parseTimeToMinutes(plage?.fermeture || plage?.fin);
      if (start === null || end === null) return false;
      const closeStr = String(plage?.fermeture || plage?.fin || '').trim();
      const isMidnightClose = closeStr === '00:00' || closeStr === '0:00';
      if (isMidnightClose) return current >= start;
      const spansMidnight = end < start;
      if (spansMidnight) return current >= start || current <= end;
      return current >= start && current <= end;
    });
  }

  if (day.ouvert === false) return false;

  const start = parseTimeToMinutes(day.ouverture || day.debut);
  const end = parseTimeToMinutes(day.fermeture || day.fin);
  if (start === null || end === null) return false;
  const closeRaw = String(day?.fermeture || day?.fin || '').trim();
  const isMidnightClose = closeRaw === '00:00' || closeRaw === '0:00';
  if (isMidnightClose) return current >= start;
  const spansMidnight = end < start;
  if (spansMidnight) return current >= start || current <= end;
  return current >= start && current <= end;
}

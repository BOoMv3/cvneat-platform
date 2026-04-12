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
  if (h && typeof h === 'object' && !Array.isArray(h) && h.weekly && typeof h.weekly === 'object') {
    return h.weekly;
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

/**
 * Parse "HH:MM" ou "HHhMM" / "HHHMM" (casse) en minutes depuis minuit.
 * Important : minuit en **ouverture** = 0. La fermeture à minuit est gérée à part
 * (`isMidnightClose` sur la chaîne "00:00" / "0:00") — ne pas mapper tout "00:00" vers 1440,
 * sinon une plage 00:00–23:59 devient « overnight » et passe à tort pour ouverte 24h/24.
 */
export function parseTimeToMinutes(timeStr) {
  if (timeStr == null || timeStr === '') return null;
  // Minutes depuis minuit (ex. 660 = 11:00) — certains imports JSON utilisent des nombres.
  if (typeof timeStr === 'number' && Number.isFinite(timeStr)) {
    const n = Math.floor(timeStr);
    if (n >= 0 && n <= 1440) return n;
    return null;
  }
  if (typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const t = trimmed.replace(/[hH]/g, ':');
  const match = t.match(/^(\d{1,2})[:](\d{2})$/);
  const h = match ? parseInt(match[1], 10) : parseInt(t.split(':')[0], 10);
  const m = match ? parseInt(match[2], 10) : parseInt(t.split(':')[1] || '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 24 || m < 0 || m > 59) return null;
  let tot = h * 60 + m;
  const tl = trimmed.toLowerCase();
  if (tl === '24:00' || tl === '24h00') tot = 1440;
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
function isTruthyClosedFlag(v) {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'oui' || s === 'on';
  }
  return false;
}

export function isRestaurantOpenNowFromHoraires(horairesRaw, refDate = new Date()) {
  const h = coerceHorairesObject(horairesRaw);
  if (h == null || h === '' || (typeof h === 'object' && !Array.isArray(h) && Object.keys(h).length === 0)) {
    return false;
  }
  if (Array.isArray(h) && h.length === 0) return false;

  const day = getHeuresJourForDate(horairesRaw, refDate);
  if (day == null || day === false || typeof day !== 'object' || Array.isArray(day)) return false;
  if (isTruthyClosedFlag(day.is_closed)) return false;
  // Jour explicitement fermé : ne pas tenir compte de plages résiduelles (données incohérentes en base).
  if (day.ouvert === false || day.open === false) return false;

  const { hour, minute } = getParisNow(refDate);
  const current = hour * 60 + minute;

  const hasPlages = Array.isArray(day.plages) && day.plages.length > 0;
  const hasSingle =
    (day.ouverture || day.debut) &&
    (day.fermeture || day.fin);

  // Pas de « ouvert toute la journée » sur seul flag ouvert sans plages / sans heures (données souvent erronées).

  if (hasPlages) {
    return day.plages.some((plage) => {
      const start = parseTimeToMinutes(plage?.ouverture || plage?.debut);
      const end = parseTimeToMinutes(plage?.fermeture || plage?.fin);
      if (start === null || end === null) return false;
      const closeStr = String(plage?.fermeture || plage?.fin || '');
      const isMidnightClose = closeStr === '00:00' || closeStr === '0:00';
      if (isMidnightClose) return current >= start;
      // Overnight : portion après minuit avec fin exclusive.
      if (end < start) return current >= start || current < end;
      // Plage sur une même journée : fin exclusive (à l’heure de fermeture affichée, on est fermé).
      return current >= start && current < end;
    });
  }

  const start = parseTimeToMinutes(day.ouverture || day.debut);
  const end = parseTimeToMinutes(day.fermeture || day.fin);
  if (start === null || end === null) return false;
  const isMidnightClose = day?.fermeture === '00:00' || day?.fermeture === '0:00' || day?.fin === '00:00';
  if (isMidnightClose) return current >= start;
  if (end < start) return current >= start || current < end;
  return current >= start && current < end;
}

/**
 * Calcul unique ouvert/fermé (Europe/Paris, horaires + flags manuels).
 * Utilisé par GET /api/restaurants, GET /api/restaurants/[id], POST /api/restaurants/open-status, POST .../hours.
 */

export const EMERGENCY_FORCE_OPEN_IDS = new Set([
  'd6725fe6-59ec-413a-b39b-ddb960824999',
  'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824',
]);

const toBool = (v) =>
  v === true ||
  v === 1 ||
  v === '1' ||
  (typeof v === 'string' && v.trim().toLowerCase() === 'true');

const toMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2})[h:](\d{2})$/i);
  const hh = match ? parseInt(match[1], 10) : parseInt(trimmed.split(':')[0], 10);
  const mm = match ? parseInt(match[2], 10) : parseInt(trimmed.split(':')[1] || '0', 10);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh < 0 || hh > 24 || mm < 0 || mm > 59) return null;
  let tot = hh * 60 + mm;
  if (tot === 0 && hh === 0 && mm === 0) tot = 1440;
  if (trimmed === '24:00' || trimmed.toLowerCase() === '24h00') tot = 1440;
  return tot;
};

const coerceHorairesObject = (horairesRaw) => {
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
  if (h && typeof h === 'object' && !Array.isArray(h) && h.horaires && typeof h.horaires === 'object') return h.horaires;
  return h;
};

const getTodayDayObject = (horairesObj, now = new Date()) => {
  if (!horairesObj || typeof horairesObj !== 'object') return { day: null, meta: { reason: 'no_horaires' } };
  const tz = 'Europe/Paris';
  const todayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: tz }).format(now).toLowerCase();
  if (Array.isArray(horairesObj) && horairesObj.length >= 7) {
    const dayNamesMonday0 = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const idxMonday0 = dayNamesMonday0.indexOf(todayName);
    if (idxMonday0 >= 0 && horairesObj[idxMonday0] != null) {
      return { day: horairesObj[idxMonday0], meta: { source: 'array_monday0', idx: idxMonday0, todayName } };
    }
  }
  const dayNamesFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNamesFr.indexOf(todayName);
  const todayEn = dayIndex >= 0 ? dayNamesEn[dayIndex] : null;

  const candidates = [
    todayName,
    todayName.charAt(0).toUpperCase() + todayName.slice(1),
    todayName.toUpperCase(),
    todayName.slice(0, 3),
    todayName.slice(0, 3).toUpperCase(),
  ];
  if (todayEn) {
    candidates.push(
      todayEn,
      todayEn.charAt(0).toUpperCase() + todayEn.slice(1),
      todayEn.toUpperCase(),
      todayEn.slice(0, 3),
      todayEn.slice(0, 3).toUpperCase(),
    );
  }
  if (dayIndex >= 0) candidates.push(dayIndex, String(dayIndex));

  for (const k of candidates) {
    if (horairesObj[k] != null) return { day: horairesObj[k], meta: { source: 'key', key: k, todayName, dayIndex } };
  }
  const candLower = new Set(candidates.map((x) => String(x).trim().toLowerCase()));
  for (const k of Object.keys(horairesObj)) {
    if (candLower.has(String(k).trim().toLowerCase())) {
      return { day: horairesObj[k], meta: { source: 'key_lower', key: k, todayName, dayIndex } };
    }
  }
  return { day: null, meta: { reason: 'no_day_match', todayName, dayIndex, keys: Object.keys(horairesObj).slice(0, 20) } };
};

/**
 * @returns {{ isOpen: boolean, reason: string, meta?: object }}
 */
export function isOpenNowFromHoraires(horairesRaw, now = new Date()) {
  const horairesObj = coerceHorairesObject(horairesRaw);
  const { day, meta } = getTodayDayObject(horairesObj, now);
  if (!day) return { isOpen: false, reason: meta?.reason || 'no_day', meta };
  if (day.is_closed === true) return { isOpen: false, reason: 'closed_today_flag', meta };

  const tz = 'Europe/Paris';
  const timeParts = new Intl.DateTimeFormat('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const ch = parseInt(timeParts.find((p) => p.type === 'hour')?.value || '0', 10);
  const cm = parseInt(timeParts.find((p) => p.type === 'minute')?.value || '0', 10);
  const current = ch * 60 + cm;

  const inRange = (start, end, isMidnightClose) => {
    if (start == null || end == null) return false;
    if (isMidnightClose) return current >= start;
    const spansMidnight = end < start;
    return spansMidnight ? (current >= start || current <= end) : (current >= start && current <= end);
  };

  const hasPlages = Array.isArray(day.plages) && day.plages.length > 0;
  const hasSingleRange = Boolean((day.ouverture || day.debut) && (day.fermeture || day.fin));
  const hasExplicitHours = hasPlages || hasSingleRange;
  if (!hasExplicitHours && day.ouvert === false) return { isOpen: false, reason: 'closed_today', meta };

  if (hasPlages) {
    const any = day.plages.some((plage) => {
      const openStr = plage?.ouverture || plage?.debut;
      const closeStr = plage?.fermeture || plage?.fin;
      const start = toMinutes(openStr);
      const end = toMinutes(closeStr);
      const closeRaw = String(closeStr || '').trim();
      const isMidnightClose = closeRaw === '00:00' || closeRaw === '0:00';
      return inRange(start, end, isMidnightClose);
    });
    return { isOpen: any, reason: any ? 'open' : 'outside_hours', meta: { ...meta, current } };
  }

  const openStr = day.ouverture || day.debut;
  const closeStr = day.fermeture || day.fin;
  const start = toMinutes(openStr);
  const end = toMinutes(closeStr);
  const closeRaw = String(closeStr || '').trim();
  const isMidnightClose = closeRaw === '00:00' || closeRaw === '0:00';
  if (start == null || end == null) return { isOpen: false, reason: 'time_parse_error', meta: { ...meta, openStr, closeStr, current } };
  const open = inRange(start, end, isMidnightClose);
  return { isOpen: open, reason: open ? 'open' : 'outside_hours', meta: { ...meta, openStr, closeStr, start, end, current } };
}

/**
 * @param {{ id?: string|null, horaires: unknown, ferme_manuellement: unknown, ouvert_manuellement: unknown, now?: Date }}
 * @returns {{ isOpen: boolean, isManuallyClosed: boolean, reason: string, meta?: object }}
 */
export function computeRestaurantOpenState({ id = null, horaires, ferme_manuellement, ouvert_manuellement, now = new Date() }) {
  if (id != null && EMERGENCY_FORCE_OPEN_IDS.has(String(id))) {
    return { isOpen: true, isManuallyClosed: false, reason: 'emergency_force_open', meta: {} };
  }

  const fm = toBool(ferme_manuellement);
  if (fm) {
    return { isOpen: false, isManuallyClosed: true, reason: 'manual', meta: {} };
  }

  const om = toBool(ouvert_manuellement);
  if (om) {
    return { isOpen: true, isManuallyClosed: false, reason: 'manual_open', meta: {} };
  }

  const computed = isOpenNowFromHoraires(horaires, now);
  return {
    isOpen: computed.isOpen === true,
    isManuallyClosed: false,
    reason: computed.reason,
    meta: computed.meta,
  };
}

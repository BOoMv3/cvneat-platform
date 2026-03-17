import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m = '0'] = hhmm.split(':');
  const hh = parseInt(h, 10);
  const mm = parseInt(m, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  let tot = hh * 60 + mm;
  if (tot === 0 && hh === 0 && mm === 0) tot = 1440; // 00:00 = 24:00 (fin de service)
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
  if (!horairesObj || typeof horairesObj !== 'object') return null;
  const tz = 'Europe/Paris';
  const todayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: tz }).format(now).toLowerCase();
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
    if (horairesObj[k] != null) return horairesObj[k];
  }
  // fallback lowercase match
  const candLower = new Set(candidates.map((x) => String(x).trim().toLowerCase()));
  for (const k of Object.keys(horairesObj)) {
    if (candLower.has(String(k).trim().toLowerCase())) return horairesObj[k];
  }
  return null;
};

const isOpenNowFromHoraires = (horairesRaw, now = new Date()) => {
  const horairesObj = coerceHorairesObject(horairesRaw);
  const day = getTodayDayObject(horairesObj, now);
  if (!day || day.is_closed === true || day.ouvert === false) return false;

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

  if (Array.isArray(day.plages) && day.plages.length > 0) {
    return day.plages.some((plage) => {
      const openStr = plage?.ouverture || plage?.debut;
      const closeStr = plage?.fermeture || plage?.fin;
      const start = toMinutes(openStr);
      const end = toMinutes(closeStr);
      const closeRaw = String(closeStr || '').trim();
      const isMidnightClose = closeRaw === '00:00' || closeRaw === '0:00';
      return inRange(start, end, isMidnightClose);
    });
  }

  const openStr = day.ouverture || day.debut;
  const closeStr = day.fermeture || day.fin;
  const start = toMinutes(openStr);
  const end = toMinutes(closeStr);
  const closeRaw = String(closeStr || '').trim();
  const isMidnightClose = closeRaw === '00:00' || closeRaw === '0:00';
  return inRange(start, end, isMidnightClose);
};

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 });
    }
    const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
    const now = new Date();

    let query = sb.from('restaurants').select('id, horaires, ferme_manuellement');
    if (ids.length > 0) query = query.in('id', ids);

    const { data, error } = await query;
    if (error) {
      console.error('❌ open-status restaurants error:', error);
      return NextResponse.json({ error: 'Erreur chargement restaurants' }, { status: 500 });
    }

    const map = {};
    for (const r of data || []) {
      const isManuallyClosed = r?.ferme_manuellement === true || r?.ferme_manuellement === 1 || r?.ferme_manuellement === 'true';
      map[r.id] = {
        isOpen: isManuallyClosed ? false : isOpenNowFromHoraires(r?.horaires, now),
        isManuallyClosed,
      };
    }

    const res = NextResponse.json({ map });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (e) {
    console.error('❌ open-status error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


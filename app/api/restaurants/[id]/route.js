import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasExplicitScheduleForDay } from '../../../../lib/restaurant-horaires-paris';

// Créer un client admin pour bypasser RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const toBool = (v) => v === true || v === 1 || (typeof v === 'string' && v.trim().toLowerCase() === 'true');
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
    try { h = JSON.parse(s); } catch { break; }
  }
  if (h && typeof h === 'object' && !Array.isArray(h) && h.horaires && typeof h.horaires === 'object') return h.horaires;
  return h;
};
const getDayObjectParis = (horairesObj, now = new Date()) => {
  if (!horairesObj || typeof horairesObj !== 'object') return null;
  const tz = 'Europe/Paris';
  const todayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: tz }).format(now).toLowerCase();
  if (Array.isArray(horairesObj) && horairesObj.length >= 7) {
    const dayNamesMonday0 = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const idxMonday0 = dayNamesMonday0.indexOf(todayName);
    if (idxMonday0 >= 0 && horairesObj[idxMonday0] != null) return horairesObj[idxMonday0];
  }
  const dayNamesFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const dayIndex = dayNamesFr.indexOf(todayName);
  const candidates = [todayName, todayName.charAt(0).toUpperCase() + todayName.slice(1), todayName.toUpperCase(), todayName.slice(0, 3), todayName.slice(0, 3).toUpperCase()];
  if (dayIndex >= 0) candidates.push(dayIndex, String(dayIndex));
  for (const k of candidates) {
    if (horairesObj[k] != null) return horairesObj[k];
  }
  const candLower = new Set(candidates.map((x) => String(x).trim().toLowerCase()));
  for (const k of Object.keys(horairesObj)) {
    if (candLower.has(String(k).trim().toLowerCase())) return horairesObj[k];
  }
  return null;
};
const isOpenNowParis = (horairesRaw, now = new Date()) => {
  const horairesObj = coerceHorairesObject(horairesRaw);
  const day = getDayObjectParis(horairesObj, now);
  if (!day || day.is_closed === true) return false;
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
  if (!hasExplicitHours && day.ouvert === false) return false;
  if (hasPlages) {
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

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erreur récupération restaurant:', error);
      return NextResponse.json({ message: "Erreur lors de la récupération du restaurant", error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ message: "Restaurant non trouvé" }, { status: 404 });
    }

    // Calculer la note moyenne depuis les vrais avis
    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('restaurant_id', id);

  let calculatedRating = 0;
  let reviewsCount = 0;
  if (!reviewsError && reviews && reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    calculatedRating = Math.round((totalRating / reviews.length) * 10) / 10;
    reviewsCount = reviews.length;
  }

    // Ajouter les valeurs par défaut pour les colonnes manquantes
    const restaurantWithDefaults = {
      ...data,
      frais_livraison: data.frais_livraison || 2.50,
      deliveryTime: data.deliveryTime || 30,
      minOrder: data.minOrder || 15,
      rating: calculatedRating || data.rating || 0, // Utiliser la note calculée ou celle de la DB
      reviews_count: reviewsCount || data.reviews_count || 0,
      mise_en_avant: data.mise_en_avant || false,
      mise_en_avant_fin: data.mise_en_avant_fin || null
    };
    const fm = toBool(data.ferme_manuellement);
    const om = toBool(data.ouvert_manuellement);
    restaurantWithDefaults.ferme_manuellement = fm;
    restaurantWithDefaults.ouvert_manuellement = om;
    const now = new Date();
    const hoursOpen = isOpenNowParis(data.horaires, now);
    const explicit = hasExplicitScheduleForDay(data.horaires, now);
    restaurantWithDefaults.is_open_now = fm ? false : om ? (explicit ? hoursOpen : true) : hoursOpen;

    const res = NextResponse.json(restaurantWithDefaults);
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error) {
    console.error('❌ Erreur serveur lors de la récupération du restaurant:', error);
    return NextResponse.json(
      { message: "Erreur serveur lors de la récupération du restaurant", error: error.message },
      { status: 500 }
    );
  }
} 
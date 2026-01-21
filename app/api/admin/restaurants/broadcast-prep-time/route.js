import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../../../lib/supabase';
import sseBroadcaster from '../../../../../lib/sse-broadcast';

function toMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m = '0'] = hhmm.split(':');
  const hh = parseInt(h, 10);
  const mm = parseInt(m, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  let tot = hh * 60 + mm;
  // Alignement avec la logique du front: 00:00 peut représenter 24:00 (fin de service)
  if (tot === 0 && hh === 0 && mm === 0) tot = 1440;
  return tot;
}

function isOpenNowFromHoraires(horairesRaw, now = new Date()) {
  if (!horairesRaw) return false;
  let horaires = horairesRaw;
  if (typeof horaires === 'string') {
    try {
      horaires = JSON.parse(horaires);
    } catch {
      return false;
    }
  }

  const tz = 'Europe/Paris';
  const frTime = now.toLocaleString('fr-FR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  const [ch, cm] = frTime.split(':').map(Number);
  const current = ch * 60 + cm;

  const dayName = now.toLocaleString('fr-FR', { timeZone: tz, weekday: 'long' }).toLowerCase();
  const variants = [dayName, dayName.charAt(0).toUpperCase() + dayName.slice(1), dayName.toUpperCase()];
  const day = variants.map(k => horaires?.[k]).find(Boolean);
  if (!day) return false;

  if (Array.isArray(day.plages) && day.plages.length > 0) {
    return day.plages.some((plage) => {
      const start = toMinutes(plage?.ouverture);
      const end = toMinutes(plage?.fermeture);
      if (start === null || end === null) return false;
      const isMidnightClose = plage?.fermeture === '00:00' || plage?.fermeture === '0:00';
      if (isMidnightClose) return current >= start;
      return current >= start && current <= end;
    });
  }

  if (day.ouvert === false) return false;
  const start = toMinutes(day.ouverture);
  const end = toMinutes(day.fermeture);
  if (start === null || end === null) return false;
  const isMidnightClose = day?.fermeture === '00:00' || day?.fermeture === '0:00';
  if (isMidnightClose) return current >= start;
  return current >= start && current <= end;
}

async function getAdminUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  if (!profile?.role || profile.role !== 'admin') return null;
  return user;
}

export async function POST(request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 });
    }
    const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const now = new Date();
    const { data: restaurants, error } = await sb
      .from('restaurants')
      .select('id, nom, user_id, horaires, ferme_manuellement, prep_time_minutes, prep_time_updated_at');

    if (error) {
      console.error('❌ Erreur chargement restaurants:', error);
      return NextResponse.json({ error: 'Erreur chargement restaurants' }, { status: 500 });
    }

    const openRestaurants = (restaurants || []).filter((r) => {
      if (!r?.id || !r?.user_id) return false;
      if (r.ferme_manuellement === true) return false;
      return isOpenNowFromHoraires(r.horaires, now);
    });

    const message =
      "Merci d'indiquer votre temps de préparation (il sera affiché sur votre carte sur la page d'accueil). Vous pouvez le modifier à tout moment pendant le service sur votre dashboard.";

    let inserted = 0;
    let broadcasted = 0;
    let insertError = null;

    for (const r of openRestaurants) {
      // Insérer une notif (non lue) côté restaurant
      try {
        const { error: insErr } = await sb
          .from('notifications')
          .insert({
            restaurant_id: r.id,
            type: 'prep_time_prompt',
            message,
            lu: false,
          });
        if (!insErr) inserted += 1;
        if (insErr && !insertError) insertError = { code: insErr.code, message: insErr.message };
      } catch {
        // ignore
      }

      // Broadcast SSE (si le resto est connecté)
      try {
        const ok = sseBroadcaster.broadcast(r.id, {
          type: 'prep_time_prompt',
          message,
          restaurantId: r.id,
          timestamp: new Date().toISOString(),
        });
        if (ok) broadcasted += 1;
      } catch (e) {
        console.warn('⚠️ Broadcast SSE échoué:', r.id, e?.message || e);
      }
    }

    return NextResponse.json({
      success: true,
      targeted: openRestaurants.length,
      inserted,
      broadcasted,
      insertError,
    });
  } catch (e) {
    console.error('❌ Erreur broadcast-prep-time:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}



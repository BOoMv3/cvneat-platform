import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Important endpoint for the homepage: keep it fast.
// We allow short CDN caching to reduce server CPU load.
export const dynamic = 'force-dynamic';

// Créer un client admin pour bypasser RLS
let supabaseAdmin = null;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables d\'environnement manquantes:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey
    });
  } else {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log('✅ Client Supabase Admin initialisé');
  }
} catch (error) {
  console.error('❌ Erreur initialisation Supabase Admin:', error);
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      console.error('❌ Client Supabase Admin non initialisé');
      return NextResponse.json(
        { message: "Configuration Supabase manquante", error: "Variables d'environnement non définies" },
        { status: 500 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('*, frais_livraison, ferme_manuellement, ouvert_manuellement, horaires, offre_active, offre_label, offre_description');
      // .eq('status', 'active'); // Temporairement désactivé pour debug

    if (error) {
      console.error('❌ Erreur Supabase lors de la récupération des restaurants:', error);
      return NextResponse.json({ message: "Erreur lors de la récupération des restaurants", error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      const res = NextResponse.json([]);
      // Pas de cache pour garder ferme_manuellement à jour (éviter liste "ouvert" vs détail "fermé manuellement")
      res.headers.set('Cache-Control', 'no-store, max-age=0');
      return res;
    }

    // Exclure les restaurants retirés (Molokai, O Toasty, etc.)
    const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const masquesContient = ['molokai', 'otoasty'];
    const filtered = data.filter((r) => {
      const n = normalize(r.nom);
      return !masquesContient.some((mot) => n.includes(mot));
    });

    // Une seule lecture : on utilise directement les données du select (pas de relecture pour éviter cache/replica)
    const toBool = (v) => v === true || v === 1 || (typeof v === 'string' && v.trim().toLowerCase() === 'true');
    const isLaBonnePate = (nom) => nom && (String(nom).toLowerCase().includes('bonne pâte') || String(nom).toLowerCase().includes('bonne pate'));

    // Statut ouvert/fermé calculé côté serveur (Europe/Paris) pour éviter les divergences client.
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
      // ARRAY lundi=0
      if (Array.isArray(horairesObj) && horairesObj.length >= 7) {
        const dayNamesMonday0 = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        const idxMonday0 = dayNamesMonday0.indexOf(todayName);
        if (idxMonday0 >= 0 && horairesObj[idxMonday0] != null) return horairesObj[idxMonday0];
      }
      const dayNamesFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const dayIndex = dayNamesFr.indexOf(todayName);
      const candidates = [
        todayName,
        todayName.charAt(0).toUpperCase() + todayName.slice(1),
        todayName.toUpperCase(),
        todayName.slice(0, 3),
        todayName.slice(0, 3).toUpperCase()
      ];
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

      // Même règle que /api/restaurants/[id]/hours :
      // si plages/heures explicites existent, elles priment sur le flag ouvert.
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
    const withFermeManuel = filtered.map((r) => {
      const fm = toBool(r.ferme_manuellement);
      const om = toBool(r.ouvert_manuellement);
      const oa = r.offre_active;
      let offreActiveFinal = oa === true || oa === 1 || (typeof oa === 'string' && oa.trim().toLowerCase() === 'true');
      if (isLaBonnePate(r.nom)) { offreActiveFinal = false; }
      // Priorité statut manuel :
      // 1) fermé manuellement => fermé
      // 2) ouvert_manuellement => ouvert
      // 3) sinon horaires
      const isOpenNow = fm ? false : (om ? true : isOpenNowParis(r.horaires, new Date()));
      return {
        ...r,
        ferme_manuellement: fm,
        ouvert_manuellement: om,
        is_open_now: isOpenNow,
        offre_active: offreActiveFinal,
        offre_label: isLaBonnePate(r.nom) ? null : (r.offre_label ?? null),
        offre_description: isLaBonnePate(r.nom) ? null : (r.offre_description ?? null)
      };
    });

    // Performance: do not query `reviews` per restaurant (N+1 queries).
    // We rely on stored `rating` / `reviews_count` columns in `restaurants`.
    const res = NextResponse.json(withFermeManuel);
    // Bloquer tout cache (navigateur, CDN Vercel, proxies) pour éviter données périmées
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    res.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('❌ Erreur serveur lors de la récupération des restaurants:', error);
    return NextResponse.json(
      { message: "Erreur serveur lors de la récupération des restaurants", error: error.message },
      { status: 500 }
    );
  }
}

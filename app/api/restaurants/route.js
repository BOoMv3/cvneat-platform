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
      .select('*, frais_livraison, ferme_manuellement, horaires, offre_active, offre_label, offre_description');
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

    // Relecture fraîche (sans ouvert_manuellement pour ne pas faire échouer si la colonne absente)
    const ids = filtered.map((r) => r.id);
    let freshMap = {};
    try {
      const { data: freshList, error: freshErr } = await supabaseAdmin
        .from('restaurants')
        .select('id, ferme_manuellement, offre_active, offre_label, offre_description')
        .in('id', ids);
      if (!freshErr && freshList?.length) {
        freshList.forEach((row) => { freshMap[row.id] = row; });
      }
    } catch (_) {}

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
      // Calculer l'index du jour en Europe/Paris sans dépendre de la locale
      const tz = 'Europe/Paris';
      const paris = new Date(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(now)
      );
      const dow = paris.getDay(); // 0=dimanche, 1=lundi, ...
      const dayNamesFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayName = dayNamesFr[dow];
      const todayEn = dayNamesEn[dow];

      // ARRAY lundi=0
      if (Array.isArray(horairesObj) && horairesObj.length >= 7) {
        const dayNamesMonday0 = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        const idxMonday0 = dayNamesMonday0.indexOf(todayName);
        if (idxMonday0 >= 0 && horairesObj[idxMonday0] != null) return horairesObj[idxMonday0];
      }
      const candidates = [
        todayName,
        todayName.charAt(0).toUpperCase() + todayName.slice(1),
        todayName.toUpperCase(),
        todayName.slice(0, 3),
        todayName.slice(0, 3).toUpperCase(),
        todayEn,
        todayEn.charAt(0).toUpperCase() + todayEn.slice(1),
        todayEn.toUpperCase(),
        todayEn.slice(0, 3),
        todayEn.slice(0, 3).toUpperCase(),
        dow,
        String(dow)
      ];
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
    const withFermeManuel = filtered.map((r) => {
      const fresh = freshMap[r.id] || r;
      const fm = toBool(fresh.ferme_manuellement);
      // ouvert_manuellement vient de r (*) pour que la liste ne plante pas si la colonne n'existe pas encore
      const om = toBool(fresh.ouvert_manuellement ?? r.ouvert_manuellement);
      const oa = fresh.offre_active;
      let offreActiveFinal = oa === true || oa === 1 || (typeof oa === 'string' && oa.trim().toLowerCase() === 'true');
      if (isLaBonnePate(r.nom)) { offreActiveFinal = false; }
      const isOpenNow = fm ? false : isOpenNowParis(r.horaires, new Date());
      return {
        ...r,
        ferme_manuellement: fm,
        ouvert_manuellement: om,
        is_open_now: isOpenNow,
        offre_active: offreActiveFinal,
        offre_label: isLaBonnePate(r.nom) ? null : (fresh.offre_label ?? r.offre_label ?? null),
        offre_description: isLaBonnePate(r.nom) ? null : (fresh.offre_description ?? r.offre_description ?? null)
      };
    });

    // Performance: do not query `reviews` per restaurant (N+1 queries).
    // We rely on stored `rating` / `reviews_count` columns in `restaurants`.
    const res = NextResponse.json(withFermeManuel);
    // Pas de cache pour ferme_manuellement frais (cohérence liste/détail)
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error) {
    console.error('❌ Erreur serveur lors de la récupération des restaurants:', error);
    return NextResponse.json(
      { message: "Erreur serveur lors de la récupération des restaurants", error: error.message },
      { status: 500 }
    );
  }
}

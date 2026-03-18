import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Créer un client admin pour bypasser RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Email',
  'Access-Control-Max-Age': '86400',
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
  if (h && typeof h === 'object' && !Array.isArray(h) && h.horaires && typeof h.horaires === 'object') {
    return h.horaires;
  }
  return h;
};

function json(body, init) {
  const res = NextResponse.json(body, init);
  for (const [k, v] of Object.entries(corsHeaders)) {
    res.headers.set(k, v);
  }
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET - Récupérer les horaires d'un restaurant au format lisible
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('horaires, ferme_manuellement, ouvert_manuellement')
      .eq('id', id)
      .single();

    if (error || !restaurant) {
      return json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Convertir les horaires JSON en format lisible
    let horaires = coerceHorairesObject(restaurant.horaires) || {};
    
    // Si horaires est une chaîne JSON, la parser (fallback)
    if (typeof horaires === 'string') {
      try {
        horaires = JSON.parse(horaires);
      } catch (e) {
        console.error('Erreur parsing horaires JSON:', e);
        horaires = {};
      }
    }
    
    const joursSemaine = [
      { key: 'lundi', label: 'Lundi', dayIndex: 1, variants: ['lundi', 'Lundi', 'LUNDI'] },
      { key: 'mardi', label: 'Mardi', dayIndex: 2, variants: ['mardi', 'Mardi', 'MARDI'] },
      { key: 'mercredi', label: 'Mercredi', dayIndex: 3, variants: ['mercredi', 'Mercredi', 'MERCREDI'] },
      { key: 'jeudi', label: 'Jeudi', dayIndex: 4, variants: ['jeudi', 'Jeudi', 'JEUDI'] },
      { key: 'vendredi', label: 'Vendredi', dayIndex: 5, variants: ['vendredi', 'Vendredi', 'VENDREDI'] },
      { key: 'samedi', label: 'Samedi', dayIndex: 6, variants: ['samedi', 'Samedi', 'SAMEDI'] },
      { key: 'dimanche', label: 'Dimanche', dayIndex: 0, variants: ['dimanche', 'Dimanche', 'DIMANCHE'] }
    ];

    const formattedHours = joursSemaine.map(jour => {
      // Chercher le jour dans les horaires avec différentes variantes de casse
      let jourHoraire = null;
      for (const variant of jour.variants) {
        if (horaires[variant]) {
          jourHoraire = horaires[variant];
          break;
        }
      }
      
      // Support pour plages multiples (nouveau format)
      const hasPlages = Array.isArray(jourHoraire?.plages) && jourHoraire.plages.length > 0;
      
      return {
        day: jour.label,
        day_key: jour.key,
        day_of_week: jour.dayIndex,
        ouvert: jourHoraire?.ouvert || false,
        ouverture: hasPlages ? null : (jourHoraire?.ouverture || null), // null si plages multiples
        fermeture: hasPlages ? null : (jourHoraire?.fermeture || null), // null si plages multiples
        plages: hasPlages ? jourHoraire.plages : null, // Inclure les plages si présentes
        is_closed: !jourHoraire?.ouvert || false
      };
    });
    
    console.log('Horaires formatées pour restaurant', id, ':', formattedHours);

    const fm = restaurant.ferme_manuellement;
    const isManuallyClosed = fm === true || fm === 'true' || fm === 1 || fm === '1' ||
      (typeof fm === 'string' && fm.toLowerCase().trim() === 'true');
    const res = json({
      hours: formattedHours,
      is_manually_closed: isManuallyClosed
    });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error) {
    console.error('Erreur récupération horaires:', error);
    return json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Vérifier si le restaurant est ouvert maintenant
export async function POST(request, { params }) {
  try {
    const { id } = params;
    
    // Gérer le cas où le body est vide ou manquant
    let body = {};
    try {
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        body = await request.json();
      }
    } catch (e) {
      // Si pas de body ou erreur de parsing, utiliser la date actuelle
      console.log('Pas de body dans la requête, utilisation de la date actuelle');
    }
    
    const checkDate = body.date ? new Date(body.date) : new Date();
    // Jour actuel en Europe/Paris (éviter décalage serveur UTC → "fermé" à tort)
    const todayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' });
    const todayNameParis = todayFormatter.format(checkDate).toLowerCase();
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const dayOfWeekParis = dayNames.indexOf(todayNameParis);
    if (dayOfWeekParis < 0) {
      return json({ isOpen: false, message: 'Erreur fuseau horaire', reason: 'tz_error' }, { status: 500 });
    }

    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('horaires, ferme_manuellement, ouvert_manuellement')
      .eq('id', id)
      .single();

    if (error || !restaurant) {
      return json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Normaliser ferme_manuellement - UNIQUEMENT true si valeur explicitement truthy
    const fm = restaurant.ferme_manuellement;
    const isManuallyClosed = fm === true || fm === 'true' || fm === 1 || fm === '1' ||
      (typeof fm === 'string' && fm.toLowerCase().trim() === 'true');
    // Tout le reste (false, 'false', null, undefined, '', etc.) = PAS fermé manuellement
    
    // LOGIQUE: Si ferme_manuellement = true → TOUJOURS FERMÉ (ne s'ouvre jamais automatiquement)
    if (isManuallyClosed) {
      console.log(`[API hours POST] Restaurant ${id} - FERMÉ MANUELLEMENT (ferme_manuellement = ${fm})`);
      const res = json({
        isOpen: false,
        message: 'Restaurant fermé manuellement - Nécessite une ouverture manuelle',
        reason: 'manual',
        isManuallyClosed: true
      });
      res.headers.set('Cache-Control', 'no-store, max-age=0');
      return res;
    }

    // Système 100% manuel : si pas fermé manuellement, on suit ouvert_manuellement
    const om = restaurant.ouvert_manuellement;
    const isManuallyOpen = om === true || om === 'true' || om === 1 || om === '1' ||
      (typeof om === 'string' && String(om).toLowerCase().trim() === 'true');
    const res = json({
      isOpen: isManuallyOpen,
      message: isManuallyOpen ? 'Restaurant ouvert' : 'Restaurant fermé',
      reason: isManuallyOpen ? 'open_manuel' : 'manual',
      isManuallyClosed: false
    });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;

    // Si ferme_manuellement = false ou null, vérifier les horaires normalement
    let horaires = coerceHorairesObject(restaurant.horaires) || {};
    
    // Si horaires est une chaîne JSON, la parser (fallback)
    if (typeof horaires === 'string') {
      try {
        horaires = JSON.parse(horaires);
      } catch (e) {
        console.error('Erreur parsing horaires JSON dans POST:', e);
        horaires = {};
      }
    }
    
    const todayKey = todayNameParis;
    const dayNamesFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayEn = dayOfWeekParis >= 0 ? dayNamesEn[dayOfWeekParis] : null;

    const variants = [
      todayNameParis,
      todayNameParis.charAt(0).toUpperCase() + todayNameParis.slice(1),
      todayNameParis.toUpperCase(),
      // FR abrégé
      todayNameParis.slice(0, 3),
      todayNameParis.slice(0, 3).toUpperCase(),
      // EN (si jamais stocké comme Monday/mon)
      ...(todayEn
        ? [
            todayEn,
            todayEn.charAt(0).toUpperCase() + todayEn.slice(1),
            todayEn.toUpperCase(),
            todayEn.slice(0, 3),
            todayEn.slice(0, 3).toUpperCase(),
          ]
        : [])
    ];
    let todayHours = null;
    for (const variant of variants) {
      if (horaires[variant]) {
        todayHours = horaires[variant];
        break;
      }
    }
    if (!todayHours && horaires[dayOfWeekParis] !== undefined) todayHours = horaires[dayOfWeekParis];
    if (!todayHours && dayOfWeekParis >= 0 && dayOfWeekParis < dayNamesFr.length) {
      const dayKey = dayNamesFr[dayOfWeekParis];
      if (horaires[dayKey]) todayHours = horaires[dayKey];
      if (!todayHours && todayEn && horaires[todayEn]) todayHours = horaires[todayEn];
      // support clé string "0".."6"
      if (!todayHours && horaires[String(dayOfWeekParis)] !== undefined) todayHours = horaires[String(dayOfWeekParis)];
    }
    if (!todayHours) {
      for (const k of Object.keys(horaires)) {
        if (String(k).trim().toLowerCase() === todayNameParis) {
          todayHours = horaires[k];
          break;
        }
      }
    }

    // Log détaillé pour debug
    console.log('🔍 DEBUG horaires:', {
      restaurantId: id,
      dayOfWeekParis,
      todayKey,
      variants,
      allHorairesKeys: Object.keys(horaires),
      todayHours,
      todayHoursOuvert: todayHours?.ouvert,
      hasPlages: Array.isArray(todayHours?.plages),
      plagesCount: todayHours?.plages?.length
    });

    if (!todayHours) {
      console.log('🔴 Restaurant fermé - Pas de configuration pour aujourd\'hui:', todayKey);
      return json({
        isOpen: false,
        message: 'Restaurant fermé aujourd\'hui (pas de configuration)',
        reason: 'closed_today',
        today: todayKey,
        dayOfWeek: dayOfWeekParis
      });
    }
    if (todayHours.is_closed === true) {
      return json({
        isOpen: false,
        message: 'Restaurant fermé aujourd\'hui',
        reason: 'closed_today_flag',
        today: todayKey,
        isManuallyClosed: false
      });
    }

    // IMPORTANT: Si on a des horaires explicites (plages ou ouverture/fermeture),
    // on IGNORE complètement le flag "ouvert" et on vérifie uniquement les heures
    // C'est la logique la plus fiable pour déterminer si un restaurant est ouvert
    const hasPlages = Array.isArray(todayHours.plages) && todayHours.plages.length > 0;
    const hasExplicitHours = hasPlages || (todayHours.ouverture || todayHours.debut) && (todayHours.fermeture || todayHours.fin);
    
    if (!hasExplicitHours && todayHours.ouvert === false && todayHours.ouvert !== 'true' && todayHours.ouvert !== 1) {
      console.log('🔴 Restaurant fermé - ouvert = false et pas d\'horaires explicites:', {
        ouvert: todayHours.ouvert,
        hasPlages,
        hasExplicitHours,
        ouverture: todayHours.ouverture,
        fermeture: todayHours.fermeture
      });
      return json({
        isOpen: false,
        message: 'Restaurant fermé aujourd\'hui',
        reason: 'closed_today',
        today: todayKey,
        dayOfWeek: dayOfWeekParis
      });
    }
    
    // Si on a des horaires explicites, on ignore le flag "ouvert" et on vérifie les heures
    if (hasExplicitHours) {
      console.log('🕐 Horaires explicites présents, IGNORE flag "ouvert" (', todayHours.ouvert, '), vérification des heures...');
    }

    // Vérifier l'heure actuelle (en heure locale française Europe/Paris)
    // IMPORTANT: Le serveur Vercel utilise UTC, il faut convertir en heure française
    const now = checkDate ? new Date(checkDate) : new Date();
    // Heure Paris robuste (toLocaleString = date+heure → mauvais split; on utilise formatToParts)
    const timeParts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(now);
    const currentHours = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0', 10);
    const currentMinutes = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0', 10);
    const currentTimeMinutes = currentHours * 60 + currentMinutes;

    // Parser "HH:MM" ou "HHhMM" en minutes (aligné avec la page d'accueil)
    const parseTimeToMinutes = (timeStr) => {
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
    };

    // Support pour plusieurs plages horaires (nouveau format)
    let isOpen = false;
    let matchingPlage = null;

    if (Array.isArray(todayHours.plages) && todayHours.plages.length > 0) {
      for (const plage of todayHours.plages) {
        const openStr = plage.ouverture || plage.debut;
        const closeStr = plage.fermeture || plage.fin;
        if (!openStr || !closeStr) continue;

        const openTimeMinutes = parseTimeToMinutes(openStr);
        let closeTimeMinutes = parseTimeToMinutes(closeStr);

        if (openTimeMinutes === null || closeTimeMinutes === null) continue;

        const isMidnightClose = closeStr === '00:00' || closeStr === '0:00';
        if (isMidnightClose) {
          closeTimeMinutes = 24 * 60; // 1440 minutes
        }

        // Vérifier si on est dans cette plage horaire
        let inPlage;
        if (isMidnightClose) {
          inPlage = currentTimeMinutes >= openTimeMinutes;
        } else {
          const spansMidnight = closeTimeMinutes < openTimeMinutes;
          inPlage = spansMidnight
            ? (currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes)
            : (currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes);
        }

        if (inPlage) {
          isOpen = true;
          matchingPlage = plage;
          break; // On est dans une plage, le restaurant est ouvert
        }
      }

      console.log('🕐 Vérification plages multiples:', {
        plagesCount: todayHours.plages.length,
        currentTimeMinutes,
        isOpen,
        matchingPlage
      });
    } else if (todayHours.ouverture || todayHours.debut) {
      const openStr = todayHours.ouverture || todayHours.debut;
      const closeStr = todayHours.fermeture || todayHours.fin;
      const openTimeMinutes = parseTimeToMinutes(openStr);
      let closeTimeMinutes = parseTimeToMinutes(closeStr);

      if (openTimeMinutes === null || closeTimeMinutes === null) {
        return json({
          isOpen: false,
          message: 'Horaires invalides',
          reason: 'invalid_hours'
        });
      }

      const isMidnightClose = closeStr === '00:00' || closeStr === '0:00';
      if (isMidnightClose) {
        closeTimeMinutes = 24 * 60; // 1440 minutes
      }

      if (isMidnightClose) {
        isOpen = currentTimeMinutes >= openTimeMinutes;
      } else {
        const spansMidnight = closeTimeMinutes < openTimeMinutes;
        isOpen = spansMidnight
          ? (currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes)
          : (currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes);
      }
    }
    // Pas de fallback ouvert=true sans plage : ouvert uniquement si plage explicite contient l'heure

    console.log('🕐 Vérification horaires:', {
      restaurantId: id,
      currentTime: `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`,
      currentTimeMinutes,
      isOpen,
      todayKey,
      hasPlages: Array.isArray(todayHours.plages),
      plagesCount: todayHours.plages?.length,
      matchingPlage,
      ferme_manuellement: restaurant.ferme_manuellement,
      isManuallyClosed
    });

    // Si on arrive ici, ferme_manuellement = false ou null
    // Utiliser le résultat des horaires pour déterminer si le restaurant est ouvert
    let finalIsOpen = isOpen;
    let reason = isOpen ? 'open' : 'outside_hours';
    
    if (isOpen) {
      console.log(`✅ Restaurant ${id} - OUVERT (dans les horaires)`);
    } else {
      console.log(`🔴 Restaurant ${id} - FERMÉ (hors horaires)`);
    }

    // Préparer les informations de plages pour l'affichage
    const plagesInfo = Array.isArray(todayHours.plages) && todayHours.plages.length > 0
      ? todayHours.plages.map(p => ({ ouverture: p.ouverture, fermeture: p.fermeture }))
      : (todayHours.ouverture && todayHours.fermeture ? [{ ouverture: todayHours.ouverture, fermeture: todayHours.fermeture }] : []);

    const res = json({
      isOpen: finalIsOpen,
      message: finalIsOpen ? 'Restaurant ouvert' : (reason === 'manual' ? 'Restaurant fermé manuellement' : 'Restaurant fermé'),
      reason: reason,
      isManuallyClosed: false,
      openTime: matchingPlage?.ouverture || todayHours.ouverture || null,
      closeTime: matchingPlage?.fermeture || todayHours.fermeture || null,
      plages: plagesInfo,
      currentTime: `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`,
      currentTimeMinutes,
      today: todayKey,
      debug: {
        currentTimeMinutes,
        isOpen,
        todayHours,
        matchingPlage,
        plagesCount: todayHours.plages?.length
      }
    });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error) {
    console.error('Erreur vérification horaires:', error);
    return json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


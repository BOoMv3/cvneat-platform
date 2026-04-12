import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeRestaurantOpenFields } from '@/lib/restaurant-open-compute';

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
      let jourHoraire = null;
      for (const variant of jour.variants) {
        if (horaires[variant]) {
          jourHoraire = horaires[variant];
          break;
        }
      }

      const hasPlages = Array.isArray(jourHoraire?.plages) && jourHoraire.plages.length > 0;
      const hasSingleRange = Boolean(
        jourHoraire &&
          (jourHoraire.ouverture || jourHoraire.debut) &&
          (jourHoraire.fermeture || jourHoraire.fin)
      );
      // Beaucoup de fiches n’ont pas `ouvert: true` mais seulement plages ou une plage ouverture/fermeture.
      // L’ancien `jourHoraire?.ouvert || false` forçait « fermé » pour tous ces cas → bannière / textes incohérents.
      const inferredOpen =
        jourHoraire != null &&
        jourHoraire.ouvert !== false &&
        (jourHoraire.ouvert === true || hasPlages || hasSingleRange);
      const ouvert = Boolean(inferredOpen);
      const is_closed = jourHoraire == null ? true : !ouvert;

      return {
        day: jour.label,
        day_key: jour.key,
        day_of_week: jour.dayIndex,
        ouvert,
        ouverture: hasPlages ? null : (jourHoraire?.ouverture || jourHoraire?.debut || null),
        fermeture: hasPlages ? null : (jourHoraire?.fermeture || jourHoraire?.fin || null),
        plages: hasPlages ? jourHoraire.plages : null,
        is_closed,
      };
    });

    console.log('Horaires formatées pour restaurant', id, ':', formattedHours);

    const openFields = normalizeRestaurantOpenFields({ ...restaurant, id }, new Date());
    const res = json({
      hours: formattedHours,
      is_manually_closed: openFields.is_manually_closed === true,
    });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error) {
    console.error('Erreur récupération horaires:', error);
    return json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Vérifier si le restaurant est ouvert (même moteur que liste / open-status / détail)
export async function POST(request, { params }) {
  try {
    const { id } = params;

    let body = {};
    try {
      const contentType = request.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        body = await request.json();
      }
    } catch (e) {
      console.log('Pas de body dans la requête, utilisation de la date actuelle');
    }

    const checkDate = body.date ? new Date(body.date) : new Date();

    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('horaires, ferme_manuellement, ouvert_manuellement')
      .eq('id', id)
      .single();

    if (error || !restaurant) {
      return json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    const openFields = normalizeRestaurantOpenFields({ ...restaurant, id }, checkDate);
    const isOpen = openFields.is_open_now === true;

    const hoursRes = json({
      isOpen,
      message: isOpen ? 'Restaurant ouvert' : 'Restaurant fermé',
      reason: isOpen ? 'open' : 'closed_manual_flag',
      isManuallyClosed: openFields.is_manually_closed === true,
      plages: [],
    });
    hoursRes.headers.set('Cache-Control', 'no-store, max-age=0');
    return hoursRes;
  } catch (error) {
    console.error('Erreur vérification horaires:', error);
    return json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeRestaurantOpenFields } from '@/lib/restaurant-open-compute';
import {
  getHeuresJourForDate,
  isHorairesClosedTruthy,
  pickRefDateForParisDayIndex,
} from '@/lib/restaurant-horaires-paris';

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

    const anchor = new Date();

    const joursSemaine = [
      { key: 'lundi', label: 'Lundi', dayIndex: 1 },
      { key: 'mardi', label: 'Mardi', dayIndex: 2 },
      { key: 'mercredi', label: 'Mercredi', dayIndex: 3 },
      { key: 'jeudi', label: 'Jeudi', dayIndex: 4 },
      { key: 'vendredi', label: 'Vendredi', dayIndex: 5 },
      { key: 'samedi', label: 'Samedi', dayIndex: 6 },
      { key: 'dimanche', label: 'Dimanche', dayIndex: 0 },
    ];

    // Même résolution de jour que `isRestaurantOpenNowFromHoraires` (tableau lundi→dimanche, weekly, clés numériques…).
    const formattedHours = joursSemaine.map((jour) => {
      const ref = pickRefDateForParisDayIndex(jour.dayIndex, anchor);
      const jourHoraire = getHeuresJourForDate(restaurant.horaires, ref);

      const hasPlages = Array.isArray(jourHoraire?.plages) && jourHoraire.plages.length > 0;
      const hasSingleRange = Boolean(
        jourHoraire &&
          (jourHoraire.ouverture || jourHoraire.debut) &&
          (jourHoraire.fermeture || jourHoraire.fin)
      );
      const blockedByClosed =
        isHorairesClosedTruthy(jourHoraire?.is_closed) && !hasPlages && !hasSingleRange;
      const inferredOpen =
        jourHoraire != null &&
        !blockedByClosed &&
        (hasPlages || hasSingleRange || jourHoraire.ouvert === true);
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

    const openFields = normalizeRestaurantOpenFields({ ...restaurant, id }, anchor);
    const res = json({
      hours: formattedHours,
      is_manually_closed: openFields.is_manually_closed === true,
      is_open_now: openFields.is_open_now === true,
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

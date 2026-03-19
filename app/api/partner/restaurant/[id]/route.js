import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

const clampInt = (value, { min, max } = {}) => {
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  if (Number.isNaN(n)) return null;
  if (min !== undefined && n < min) return null;
  if (max !== undefined && n > max) return null;
  return n;
};

async function getAuthedRestaurantOwner(request, restaurantId) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { error: 'Token manquant', status: 401 };

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: 'Token invalide', status: 401 };

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || !['restaurant', 'partner'].includes(userData.role)) {
    return { error: 'Accès refusé - Rôle restaurant/partenaire requis', status: 403 };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { error: 'Configuration serveur manquante (Supabase)', status: 500 };
  }

  // IMPORTANT:
  // Sur certains environnements (iOS/Safari), supabase-js peut ne pas propager correctement
  // `request.jwt.claim.sub` jusqu'à Postgres via PostgREST dans les triggers.
  // On utilise donc l'API REST Supabase directement (apikey + Authorization) pour garantir le JWT.
  const selectUrl = `${supabaseUrl}/rest/v1/restaurants?id=eq.${encodeURIComponent(restaurantId)}&select=id,user_id,nom,ferme_manuellement,ouvert_manuellement,updated_at`;
  const restaurantRes = await fetch(selectUrl, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  const restaurantJson = await restaurantRes.json().catch(() => null);
  const restaurant = Array.isArray(restaurantJson) ? restaurantJson[0] : null;
  const restaurantError = restaurantRes.ok ? null : { message: restaurantJson?.message || restaurantJson?.error || `HTTP ${restaurantRes.status}` };

  if (restaurantError || !restaurant) {
    if (restaurantRes.status === 404) {
      return { error: 'Restaurant non trouvé', status: 404 };
    }
    console.error('❌ Erreur récupération restaurant (admin):', restaurantError);
    return { error: 'Erreur serveur lors de la récupération du restaurant', status: 500 };
  }

  if (restaurant.user_id !== user.id) {
    return { error: "Vous n'êtes pas autorisé à accéder à ce restaurant", status: 403 };
  }

  return { user, restaurant, token, supabaseUrl, anonKey };
}

// GET /api/partner/restaurant/[id] - Récupérer un restaurant (owner only)
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const result = await getAuthedRestaurantOwner(request, id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json({ success: true, restaurant: result.restaurant });
  } catch (error) {
    console.error('Erreur API lecture restaurant:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/partner/restaurant/[id] - Mettre à jour un restaurant
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const auth = await getAuthedRestaurantOwner(request, id);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { user, token, supabaseUrl, anonKey } = auth;

    // Préparer les données à mettre à jour
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Ouvrir/Fermer : ne mettre à jour ferme_manuellement QUE si la requête est explicitement un toggle
    // (pas si on envoie prep_time_minutes ou autre, pour éviter qu'un autre appel écrase par erreur)
    const isToggleRequest = body.ferme_manuellement !== undefined && body.prep_time_minutes === undefined;
    if (isToggleRequest) {
      updateData.ferme_manuellement = (
        body.ferme_manuellement === true || body.ferme_manuellement === 'true' ||
        body.ferme_manuellement === 1 || body.ferme_manuellement === '1'
      );
      // Preuve explicite pour les triggers anti-flip DB
      updateData.manual_status_updated_at = new Date().toISOString();
      updateData.manual_status_updated_by = user.id;
    }

    // Temps de préparation déclaré (minutes)
    if (body.prep_time_minutes !== undefined) {
      const prep = clampInt(body.prep_time_minutes, { min: 5, max: 120 });
      if (prep === null) {
        return NextResponse.json(
          { error: 'prep_time_minutes invalide (doit être un entier entre 5 et 120)' },
          { status: 400 }
        );
      }
      updateData.prep_time_minutes = prep;
      updateData.prep_time_updated_at = new Date().toISOString();
    }

    // 1) Mise à jour via REST (JWT garanti pour le trigger)
    const updateUrl = `${supabaseUrl}/rest/v1/restaurants?id=eq.${encodeURIComponent(id)}&select=id,nom,ferme_manuellement,ouvert_manuellement,updated_at,prep_time_minutes,prep_time_updated_at`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(updateData),
      cache: 'no-store',
    });
    const updateJson = await updateRes.json().catch(() => null);
    if (!updateRes.ok) {
      console.error('❌ Erreur mise à jour restaurant (REST):', updateRes.status, updateJson);
      return NextResponse.json(
        {
          error: 'Erreur lors de la mise à jour',
          details: updateJson?.message || updateJson?.error || `HTTP ${updateRes.status}`,
          supabase: updateJson || null,
        },
        { status: 500 }
      );
    }
    const updatedRestaurant = Array.isArray(updateJson) ? updateJson[0] : updateJson;
    // NB: ouvert_manuellement est désormais géré dans la même requête que ferme_manuellement (atomic).

    console.log('✅ Restaurant mis à jour:', {
      id: updatedRestaurant.id,
      nom: updatedRestaurant.nom,
      ferme_manuellement: updatedRestaurant.ferme_manuellement
    });

    return NextResponse.json({
      success: true,
      restaurant: updatedRestaurant,
      message: 'Restaurant mis à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur API mise à jour restaurant:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


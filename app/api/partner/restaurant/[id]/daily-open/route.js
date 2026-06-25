import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabase';
import { toParisDateString } from '../../../../../../lib/restaurant-daily-open';

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

  const selectUrl = `${supabaseUrl}/rest/v1/restaurants?id=eq.${encodeURIComponent(restaurantId)}&select=id,user_id,nom,horaires,ferme_manuellement,ouvert_manuellement,daily_open_confirmed_at,daily_open_declined_date,updated_at`;
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
    return { error: 'Erreur serveur lors de la récupération du restaurant', status: 500 };
  }

  if (restaurant.user_id !== user.id) {
    return { error: "Vous n'êtes pas autorisé à accéder à ce restaurant", status: 403 };
  }

  return { user, restaurant, token, supabaseUrl, anonKey };
}

/** POST /api/partner/restaurant/[id]/daily-open — confirmation ouverture du jour */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim().toLowerCase();

    if (!['confirm', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'action invalide (confirm ou decline attendu)' },
        { status: 400 }
      );
    }

    const auth = await getAuthedRestaurantOwner(request, id);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { user, token, supabaseUrl, anonKey } = auth;

    const nowIso = new Date().toISOString();
    const updateData = {
      updated_at: nowIso,
      manual_status_updated_at: nowIso,
      manual_status_updated_by: user.id,
    };

    if (action === 'confirm') {
      updateData.daily_open_confirmed_at = nowIso;
      updateData.daily_open_declined_date = null;
      updateData.ferme_manuellement = false;
      updateData.ouvert_manuellement = false;
    } else {
      updateData.daily_open_declined_date = toParisDateString();
      updateData.daily_open_confirmed_at = null;
      updateData.ferme_manuellement = true;
      updateData.ouvert_manuellement = false;
    }

    const updateUrl = `${supabaseUrl}/rest/v1/restaurants?id=eq.${encodeURIComponent(id)}&select=id,nom,horaires,ferme_manuellement,ouvert_manuellement,daily_open_confirmed_at,daily_open_declined_date,updated_at`;
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
      console.error('❌ daily-open update error:', updateRes.status, updateJson);
      return NextResponse.json(
        {
          error: 'Erreur lors de la mise à jour',
          details: updateJson?.message || updateJson?.error || `HTTP ${updateRes.status}`,
        },
        { status: 500 }
      );
    }

    const updatedRestaurant = Array.isArray(updateJson) ? updateJson[0] : updateJson;
    return NextResponse.json({
      success: true,
      action,
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    console.error('Erreur API daily-open:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

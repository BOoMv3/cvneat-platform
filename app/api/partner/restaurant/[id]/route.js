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
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { error: 'Configuration serveur manquante (Supabase)', status: 500 };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from('restaurants')
    // IMPORTANT: ne pas sélectionner des colonnes qui peuvent ne pas exister (migration non appliquée)
    .select('id, user_id, nom, ferme_manuellement, updated_at')
    .eq('id', restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    // PGRST116 = no rows found
    if (restaurantError?.code === 'PGRST116') {
      return { error: 'Restaurant non trouvé', status: 404 };
    }
    console.error('❌ Erreur récupération restaurant (admin):', restaurantError);
    return { error: 'Erreur serveur lors de la récupération du restaurant', status: 500 };
  }

  if (restaurant.user_id !== user.id) {
    return { error: "Vous n'êtes pas autorisé à accéder à ce restaurant", status: 403 };
  }

  return { user, restaurant, supabaseAdmin };
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
    const { supabaseAdmin } = auth;

    // Préparer les données à mettre à jour
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Ouvrir/Fermer : ne mettre à jour ferme_manuellement QUE si la requête est explicitement un toggle
    // (pas si on envoie prep_time_minutes ou autre, pour éviter qu'un autre appel écrase par erreur)
    const isToggleRequest = body.ferme_manuellement !== undefined && body.prep_time_minutes === undefined;
    const wantOuvertManuel = isToggleRequest && !(
      body.ferme_manuellement === true || body.ferme_manuellement === 'true' ||
      body.ferme_manuellement === 1 || body.ferme_manuellement === '1'
    );
    if (isToggleRequest) {
      updateData.ferme_manuellement = (
        body.ferme_manuellement === true || body.ferme_manuellement === 'true' ||
        body.ferme_manuellement === 1 || body.ferme_manuellement === '1'
      );
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

    // 1) Mise à jour (ferme_manuellement + prep_time si envoyés)
    const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update(updateData)
      .eq('id', id)
      .select('id, nom, ferme_manuellement, updated_at')
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour restaurant:', updateError);
      return NextResponse.json({
        error: 'Erreur lors de la mise à jour',
        details: updateError.message
      }, { status: 500 });
    }

    // 2) Si "Ouvrir" (ferme_manuellement = false), mettre à jour ouvert_manuellement si la colonne existe
    if (wantOuvertManuel) {
      try {
        await supabaseAdmin
          .from('restaurants')
          .update({ ouvert_manuellement: true, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (updatedRestaurant) updatedRestaurant.ouvert_manuellement = true;
      } catch (e) {
        console.warn('⚠️ ouvert_manuellement non mis à jour (colonne absente ?):', e?.message || e);
      }
    } else if (isToggleRequest) {
      try {
        await supabaseAdmin
          .from('restaurants')
          .update({ ouvert_manuellement: false, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (updatedRestaurant) updatedRestaurant.ouvert_manuellement = false;
      } catch (e) {
        console.warn('⚠️ ouvert_manuellement non mis à jour:', e?.message || e);
      }
    }
    if (updatedRestaurant && isToggleRequest) {
      updatedRestaurant.ouvert_manuellement = wantOuvertManuel;
    }

    // Si on a tenté de mettre à jour le temps de préparation, essayer de le renvoyer (si les colonnes existent)
    if (body.prep_time_minutes !== undefined) {
      try {
        const { data: extra, error: extraErr } = await supabaseAdmin
          .from('restaurants')
          .select('prep_time_minutes, prep_time_updated_at')
          .eq('id', id)
          .single();
        if (!extraErr && extra) {
          updatedRestaurant.prep_time_minutes = extra.prep_time_minutes;
          updatedRestaurant.prep_time_updated_at = extra.prep_time_updated_at;
        }
      } catch (e) {
        // Si la migration n'est pas appliquée, on ne bloque pas l'ouverture/fermeture manuelle
        console.warn('⚠️ Colonnes prep_time_* indisponibles (migration non appliquée ?):', e?.message || e);
      }
    }

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


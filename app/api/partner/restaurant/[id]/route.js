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

  if (userError || !userData || userData.role !== 'restaurant') {
    return { error: 'Accès refusé - Rôle restaurant requis', status: 403 };
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from('restaurants')
    .select('id, user_id, nom, prep_time_minutes, prep_time_updated_at')
    .eq('id', restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    return { error: 'Restaurant non trouvé', status: 404 };
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
    
    // Toujours inclure ferme_manuellement si fourni (même si false)
    if (body.ferme_manuellement !== undefined) {
      // S'assurer que c'est un booléen strict
      // Gérer correctement true, false, 'true', 'false', 1, 0, etc.
      if (body.ferme_manuellement === true || body.ferme_manuellement === 'true' || body.ferme_manuellement === 1 || body.ferme_manuellement === '1') {
        updateData.ferme_manuellement = true;
      } else if (body.ferme_manuellement === false || body.ferme_manuellement === 'false' || body.ferme_manuellement === 0 || body.ferme_manuellement === '0') {
        updateData.ferme_manuellement = false;
      } else {
        // Valeur invalide, utiliser false par défaut
        updateData.ferme_manuellement = false;
      }
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

    console.log('📝 Mise à jour restaurant:', {
      restaurant_id: id,
      updateData,
      ferme_manuellement_body_value: body.ferme_manuellement,
      ferme_manuellement_body_type: typeof body.ferme_manuellement,
      ferme_manuellement_final: updateData.ferme_manuellement
    });

    // Mettre à jour le restaurant
    const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update(updateData)
      .eq('id', id)
      .select('id, nom, ferme_manuellement, prep_time_minutes, prep_time_updated_at, updated_at')
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour restaurant:', updateError);
      return NextResponse.json({ 
        error: 'Erreur lors de la mise à jour', 
        details: updateError.message 
      }, { status: 500 });
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


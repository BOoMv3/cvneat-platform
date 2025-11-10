import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// PUT /api/partner/restaurant/[id] - Mettre à jour un restaurant
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un restaurant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'restaurant') {
      return NextResponse.json({ error: 'Accès refusé - Rôle restaurant requis' }, { status: 403 });
    }

    // Vérifier que le restaurant appartient à l'utilisateur
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, user_id, tags')
      .eq('id', id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    if (restaurant.user_id !== user.id) {
      return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à modifier ce restaurant' }, { status: 403 });
    }

    // Préparer les données à mettre à jour
    const updateData = {};
    if (body.ferme_manuellement !== undefined) {
      updateData.ferme_manuellement = body.ferme_manuellement;
    }
    if (body.is_closed !== undefined) {
      updateData.is_closed = body.is_closed;
    }
    if (Array.isArray(body.category_flags)) {
      const sanitizedFlags = body.category_flags
        .map((flag) => (typeof flag === 'string' ? flag.trim().toLowerCase() : null))
        .filter(Boolean);

      let parsedTags = {};
      if (restaurant.tags !== null && restaurant.tags !== undefined) {
        try {
          if (typeof restaurant.tags === 'string') {
            parsedTags = JSON.parse(restaurant.tags);
          } else if (typeof restaurant.tags === 'object') {
            parsedTags = restaurant.tags;
          }
        } catch {
          parsedTags = {};
        }
      }

      if (!parsedTags || typeof parsedTags !== 'object' || Array.isArray(parsedTags)) {
        parsedTags = {};
      }
      parsedTags.category_flags = sanitizedFlags;

      const serializedTags = JSON.stringify(parsedTags);
      updateData.tags =
        typeof restaurant.tags === 'object' && restaurant.tags !== null ? parsedTags : serializedTags;

      updateData.category_flags = sanitizedFlags;
      updateData.category_flags_sync_at = new Date().toISOString();
    }

    const executeUpdate = async (data) =>
      supabaseAdmin
        .from('restaurants')
        .update(data)
        .eq('id', id)
        .select()
        .single();

    let updatedRestaurant = null;
    let updateError = null;

    ({ data: updatedRestaurant, error: updateError } = await executeUpdate(updateData));

    if (updateError) {
      const fallbackData = { ...updateData };

      if (updateError.message?.includes('column "category_flags"')) {
        delete fallbackData.category_flags;
        delete fallbackData.category_flags_sync_at;
      }

      if (updateError.message?.toLowerCase().includes('json') && typeof fallbackData.tags === 'object') {
        fallbackData.tags = JSON.stringify(fallbackData.tags);
      } else if (updateError.message?.toLowerCase().includes('text') && typeof fallbackData.tags !== 'string') {
        fallbackData.tags = JSON.stringify(fallbackData.tags);
      }

      ({ data: updatedRestaurant, error: updateError } = await executeUpdate(fallbackData));
    }

    if (updateError) {
      console.error('Erreur mise à jour restaurant:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

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


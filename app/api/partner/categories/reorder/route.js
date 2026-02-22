import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

const getBearerToken = (request) => {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
};

async function getAuthedUser(request) {
  const bearer = getBearerToken(request);
  if (bearer && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.getUser(bearer);
    if (!error && data?.user) {
      return { user: data.user, via: 'bearer' };
    }
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data, error } = await supabase.auth.getUser();
  if (!error && data?.user) {
    return { user: data.user, via: 'cookie' };
  }
  return { user: null, via: null };
}

async function assertRestaurantOwner(db, restaurantId, userId) {
  const { data: restaurant, error: restaurantError } = await db
    .from('restaurants')
    .select('user_id')
    .eq('id', restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    return { ok: false, status: 404, error: 'Restaurant non trouvé' };
  }
  if (restaurant.user_id !== userId) {
    return { ok: false, status: 403, error: 'Accès non autorisé' };
  }
  return { ok: true, restaurant };
}

const isMissingColumnError = (err, column) => {
  const msg = (err?.message || '').toString().toLowerCase();
  return msg.includes('column') && msg.includes(column.toLowerCase()) && msg.includes('does not exist');
};

export async function PUT(request) {
  try {
    const { restaurantId, categories } = await request.json();

    if (!restaurantId || !categories || !Array.isArray(categories)) {
      return NextResponse.json({ error: 'restaurantId et categories requis' }, { status: 400 });
    }

    const db = supabaseAdmin || createRouteHandlerClient({ cookies });
    const { user } = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const ownership = await assertRestaurantOwner(db, restaurantId, user.id);
    if (!ownership.ok) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status });
    }

    const realCategories = categories.filter((c) => c?.id && !String(c.id).startsWith('derived-'));
    const derivedCategories = categories.filter((c) => c?.id && String(c.id).startsWith('derived-'));

    // Cas 1: Sections réelles dans menu_categories
    if (realCategories.length > 0) {
      const updates = realCategories.map((category, index) => ({
        id: category.id,
        sort_order: index + 1
      }));

      const { error } = await db
        .from('menu_categories')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        if (isMissingColumnError(error, 'sort_order')) {
          return NextResponse.json({ success: true, warning: 'sort_order_non_disponible' });
        }
        throw error;
      }
    }

    // Cas 2: Sections dérivées (catégories des plats) -> sauvegarder l'ordre sur le restaurant
    if (derivedCategories.length > 0) {
      const namesInOrder = derivedCategories
        .map((c) => (c?.name || '').trim())
        .filter(Boolean);
      if (namesInOrder.length > 0) {
        try {
          const { error: updErr } = await db
            .from('restaurants')
            .update({ category_order: namesInOrder })
            .eq('id', restaurantId);

          if (updErr && !isMissingColumnError(updErr, 'category_order')) {
            console.warn('⚠️ Mise à jour category_order:', updErr);
          }
        } catch (e) {
          if (!isMissingColumnError(e, 'category_order')) throw e;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la réorganisation des catégories:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error?.message || String(error) },
      { status: 500 }
    );
  }
} 
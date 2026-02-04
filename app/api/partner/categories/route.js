import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

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

const isMissingTableError = (err, table) => {
  const msg = (err?.message || '').toString().toLowerCase();
  return msg.includes('relation') && msg.includes(table.toLowerCase()) && msg.includes('does not exist');
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId requis' }, { status: 400 });
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

    // Récupérer les catégories (sections)
    let categories = null;
    let error = null;
    try {
      const r = await db
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order');
      categories = r.data;
      error = r.error;
    } catch (e) {
      error = e;
    }

    // Tolérance schéma: si certaines colonnes n'existent pas, retenter en minimal
    if (error) {
      if (isMissingTableError(error, 'menu_categories')) {
        // Pas de table -> fallback: dériver les sections depuis menus.category
        const { data: menuRows, error: menuErr } = await db
          .from('menus')
          .select('category')
          .eq('restaurant_id', restaurantId);
        if (menuErr) throw menuErr;

        const uniq = [];
        const seen = new Set();
        for (const row of menuRows || []) {
          const name = (row?.category || '').trim();
          if (!name) continue;
          const k = name.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          uniq.push(name);
        }
        return NextResponse.json(
          uniq.map((name, idx) => ({ id: `derived-${idx + 1}`, name, description: '', sort_order: idx + 1 }))
        );
      }

      // Colonne is_active absente -> retenter sans filtre
      if (isMissingColumnError(error, 'is_active')) {
        const r2 = await db
          .from('menu_categories')
          .select('*')
          .eq('restaurant_id', restaurantId);
        categories = r2.data;
        error = r2.error;
      }
      // Colonne sort_order absente -> retenter sans order
      if (error && isMissingColumnError(error, 'sort_order')) {
        const r3 = await db
          .from('menu_categories')
          .select('*')
          .eq('restaurant_id', restaurantId);
        categories = r3.data;
        error = r3.error;
      }
    }

    if (error) throw error;

    // Si aucune section n'existe encore: auto-créer depuis les catégories déjà utilisées par les plats.
    if (!categories || categories.length === 0) {
      const { data: menuRows, error: menuErr } = await db
        .from('menus')
        .select('category')
        .eq('restaurant_id', restaurantId);

      if (!menuErr && Array.isArray(menuRows) && menuRows.length > 0) {
        const uniq = [];
        const seen = new Set();
        for (const row of menuRows) {
          const name = (row?.category || '').trim();
          if (!name) continue;
          const k = name.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          uniq.push(name);
        }

        if (uniq.length > 0) {
          try {
            const seedRowsFull = uniq.map((name, idx) => ({
              restaurant_id: restaurantId,
              name,
              description: '',
              sort_order: idx + 1,
              is_active: true
            }));

            let seedRes = await db.from('menu_categories').insert(seedRowsFull);
            // Si colonnes non existantes, retenter minimal
            if (seedRes?.error && (isMissingColumnError(seedRes.error, 'description') || isMissingColumnError(seedRes.error, 'sort_order') || isMissingColumnError(seedRes.error, 'is_active'))) {
              const seedRowsMin = uniq.map((name) => ({ restaurant_id: restaurantId, name }));
              seedRes = await db.from('menu_categories').insert(seedRowsMin);
            }
          } catch (e) {
            // Si l'insert échoue (RLS/migration), on ne bloque pas.
            console.warn('⚠️ Auto-création sections depuis menu impossible:', e?.message || e);
          }

          const { data: seeded, error: seedErr } = await db
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .order('sort_order');

          if (!seedErr && Array.isArray(seeded)) {
            categories = seeded;
          }
        }
      }
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { restaurantId, name, description, sort_order } = await request.json();

    if (!restaurantId || !name) {
      return NextResponse.json({ error: 'restaurantId et name requis' }, { status: 400 });
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

    // Créer la nouvelle catégorie (tolérance schéma)
    let category = null;
    let error = null;
    try {
      const r = await db
        .from('menu_categories')
        .insert([{
          restaurant_id: restaurantId,
          name,
          description: description || '',
          sort_order: sort_order || 0,
          is_active: true
        }])
        .select()
        .single();
      category = r.data;
      error = r.error;
    } catch (e) {
      error = e;
    }

    if (error && (isMissingColumnError(error, 'description') || isMissingColumnError(error, 'sort_order') || isMissingColumnError(error, 'is_active'))) {
      const r2 = await db
        .from('menu_categories')
        .insert([{ restaurant_id: restaurantId, name }])
        .select()
        .single();
      category = r2.data;
      error = r2.error;
    }

    if (error) throw error;

    return NextResponse.json(category);
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { id, name, description, sort_order } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'id et name requis' }, { status: 400 });
    }

    const db = supabaseAdmin || createRouteHandlerClient({ cookies });
    const { user } = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer la catégorie + vérifier propriétaire du restaurant
    const { data: categoryRow, error: categoryError } = await db
      .from('menu_categories')
      .select('id, name, restaurant_id')
      .eq('id', id)
      .single();

    if (categoryError || !categoryRow) {
      return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 });
    }

    const { data: restaurant, error: restaurantError } = await db
      .from('restaurants')
      .select('user_id')
      .eq('id', categoryRow.restaurant_id)
      .single();

    if (restaurantError || !restaurant || restaurant.user_id !== user.id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const oldName = categoryRow.name;

    // Mettre à jour la catégorie (tolérance schéma)
    let updatedCategory = null;
    let error = null;
    const fullUpdate = {
      name,
      description: description || '',
      sort_order: sort_order || 0,
      updated_at: new Date().toISOString()
    };

    const r = await db
      .from('menu_categories')
      .update(fullUpdate)
      .eq('id', id)
      .select()
      .single();
    updatedCategory = r.data;
    error = r.error;

    if (error && (isMissingColumnError(error, 'description') || isMissingColumnError(error, 'sort_order') || isMissingColumnError(error, 'updated_at'))) {
      const r2 = await db
        .from('menu_categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      updatedCategory = r2.data;
      error = r2.error;
    }

    if (error) throw error;

    // Si la section a été renommée: synchroniser les plats existants qui utilisent l'ancien libellé
    if (oldName && name && oldName !== name) {
      try {
        await db
          .from('menus')
          .update({ category: name })
          .eq('restaurant_id', categoryRow.restaurant_id)
          .eq('category', oldName);
      } catch (e) {
        // Ne pas bloquer le renommage si la synchro échoue (RLS/migration), mais loguer.
        console.warn('⚠️ Impossible de synchroniser les plats après renommage catégorie:', e?.message || e);
      }
    }

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 });
    }

    const db = supabaseAdmin || createRouteHandlerClient({ cookies });
    const { user } = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer la catégorie + vérifier propriétaire du restaurant
    const { data: categoryRow, error: categoryError } = await db
      .from('menu_categories')
      .select('id, name, restaurant_id')
      .eq('id', id)
      .single();

    if (categoryError || !categoryRow) {
      return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 });
    }

    const { data: restaurant, error: restaurantError } = await db
      .from('restaurants')
      .select('user_id')
      .eq('id', categoryRow.restaurant_id)
      .single();

    if (restaurantError || !restaurant || restaurant.user_id !== user.id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Désactiver la catégorie (soft delete) - fallback delete si colonne absente
    let delErr = null;
    try {
      const r = await db
        .from('menu_categories')
        .update({ is_active: false })
        .eq('id', id);
      delErr = r.error;
    } catch (e) {
      delErr = e;
    }

    if (delErr && isMissingColumnError(delErr, 'is_active')) {
      const r2 = await db.from('menu_categories').delete().eq('id', id);
      delErr = r2.error;
    }

    if (delErr) throw delErr;

    // Best-effort: éviter "perdre" les plats -> les basculer en "Autres"
    if (categoryRow.name) {
      try {
        await db
          .from('menus')
          .update({ category: 'Autres' })
          .eq('restaurant_id', categoryRow.restaurant_id)
          .eq('category', categoryRow.name);
      } catch (e) {
        console.warn('⚠️ Impossible de déplacer les plats vers Autres:', e?.message || e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error?.message || String(error) },
      { status: 500 }
    );
  }
} 
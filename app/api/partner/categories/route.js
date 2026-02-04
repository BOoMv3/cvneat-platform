import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId requis' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est bien le propriétaire du restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('user_id')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || restaurant.user_id !== user.id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const db = supabaseAdmin || supabase;

    // Récupérer les catégories (sections)
    let { data: categories, error } = await db
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order');

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
            await db.from('menu_categories').insert(
              uniq.map((name, idx) => ({
                restaurant_id: restaurantId,
                name,
                description: '',
                sort_order: idx + 1,
                is_active: true
              }))
            );
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

    const supabase = createRouteHandlerClient({ cookies });

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est bien le propriétaire du restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('user_id')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || restaurant.user_id !== user.id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Créer la nouvelle catégorie
    const { data: category, error } = await supabase
      .from('menu_categories')
      .insert([{
        restaurant_id: restaurantId,
        name,
        description: description || '',
        sort_order: sort_order || 0
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(category);
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, name, description, sort_order } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'id et name requis' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const db = supabaseAdmin || supabase;

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    // Mettre à jour la catégorie
    const { data: updatedCategory, error } = await db
      .from('menu_categories')
      .update({
        name,
        description: description || '',
        sort_order: sort_order || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

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
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const db = supabaseAdmin || supabase;

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    // Désactiver la catégorie (soft delete)
    const { error } = await db
      .from('menu_categories')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

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
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
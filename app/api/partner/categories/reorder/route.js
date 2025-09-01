import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const { restaurantId, categories } = await request.json();

    if (!restaurantId || !categories || !Array.isArray(categories)) {
      return NextResponse.json({ error: 'restaurantId et categories requis' }, { status: 400 });
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

    // Mettre à jour l'ordre de toutes les catégories
    const updates = categories.map((category, index) => ({
      id: category.id,
      sort_order: index + 1
    }));

    const { error } = await supabase
      .from('menu_categories')
      .upsert(updates, { onConflict: 'id' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la réorganisation des catégories:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET - Récupérer les suppléments d'un restaurant
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from('supplements')
      .select('*')
      .eq('restaurant_id', id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Erreur lors de la récupération des suppléments:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des suppléments' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer un nouveau supplément
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, price, category, description } = body;

    // Vérifier que l'utilisateur est connecté et est le propriétaire du restaurant
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est propriétaire du restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('user_id')
      .eq('id', id)
      .single();

    if (restaurantError || !restaurant || restaurant.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('supplements')
      .insert({
        restaurant_id: id,
        name,
        price: parseFloat(price),
        category: category || 'général',
        description: description || '',
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création du supplément:', error);
      return NextResponse.json({ error: 'Erreur lors de la création du supplément' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Modifier un supplément
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { supplementId, name, price, category, description, is_active } = body;

    // Vérifier que l'utilisateur est connecté et est le propriétaire du restaurant
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est propriétaire du restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('user_id')
      .eq('id', id)
      .single();

    if (restaurantError || !restaurant || restaurant.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('supplements')
      .update({
        name,
        price: parseFloat(price),
        category: category || 'général',
        description: description || '',
        is_active: is_active !== undefined ? is_active : true
      })
      .eq('id', supplementId)
      .eq('restaurant_id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la modification du supplément:', error);
      return NextResponse.json({ error: 'Erreur lors de la modification du supplément' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Supprimer un supplément
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const supplementId = searchParams.get('supplementId');

    // Vérifier que l'utilisateur est connecté et est le propriétaire du restaurant
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est propriétaire du restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('user_id')
      .eq('id', id)
      .single();

    if (restaurantError || !restaurant || restaurant.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { error } = await supabase
      .from('supplements')
      .delete()
      .eq('id', supplementId)
      .eq('restaurant_id', id);

    if (error) {
      console.error('Erreur lors de la suppression du supplément:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression du supplément' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

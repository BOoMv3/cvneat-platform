import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET - Récupérer les suppléments d'un restaurant
export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Essayer d'abord avec la table 'supplements' (format standard)
    const { data: supplementsData, error: supplementsError } = await supabase
      .from('supplements')
      .select('*')
      .eq('restaurant_id', id)
      .eq('is_active', true)
      .order('name');

    // Si la table 'supplements' existe et retourne des données, les utiliser
    if (!supplementsError && supplementsData && supplementsData.length > 0) {
      // Formater les données pour correspondre au format attendu (nom, prix)
      const formattedSupplements = supplementsData.map(sup => ({
        id: sup.id,
        nom: sup.name || sup.nom || 'Supplément',
        name: sup.name || sup.nom || 'Supplément',
        prix: parseFloat(sup.price || sup.prix || 0),
        price: parseFloat(sup.price || sup.prix || 0),
        description: sup.description || '',
        category: sup.category || 'général',
        disponible: sup.is_active !== false,
        is_active: sup.is_active !== false
      }));
      return NextResponse.json(formattedSupplements);
    }

    // Si aucune erreur mais pas de données, retourner un tableau vide
    if (!supplementsError) {
      return NextResponse.json([]);
    }

    // Si erreur, vérifier si c'est parce que la table n'existe pas
    // Essayer avec une autre structure possible
    console.warn('⚠️ Table supplements non trouvée ou erreur:', supplementsError.message);
    
    // Retourner un tableau vide plutôt qu'une erreur pour permettre au client de continuer
    return NextResponse.json([]);
  } catch (error) {
    console.error('Erreur serveur:', error);
    // Retourner un tableau vide plutôt qu'une erreur
    return NextResponse.json([]);
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

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// GET /api/partner/formulas - Récupérer toutes les formules du restaurant
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer le restaurant de l'utilisateur
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Récupérer les formules avec leurs items
    const { data: formulas, error: formulasError } = await supabase
      .from('formulas')
      .select(`
        *,
        formula_items:formula_items(
          id,
          order_index,
          quantity,
          menu:menus(
            id,
            nom,
            description,
            prix,
            image_url,
            category
          )
        )
      `)
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (formulasError) {
      console.error('Erreur récupération formules:', formulasError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des formules' }, { status: 500 });
    }

    // Formater les données pour le frontend
    const formattedFormulas = (formulas || []).map(formula => ({
      ...formula,
      items: (formula.formula_items || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map(item => ({
          id: item.id,
          order_index: item.order_index,
          quantity: item.quantity,
          menu: item.menu
        }))
    }));

    return NextResponse.json(formattedFormulas);
  } catch (error) {
    console.error('Erreur API formules:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/partner/formulas - Créer une nouvelle formule
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      nom, 
      description = '', 
      prix, 
      prix_reduit = null,
      image_url = null, 
      disponible = true,
      menu_items = [] // Array of { menu_id, order_index, quantity }
    } = body;

    if (!nom || !prix || !menu_items || menu_items.length === 0) {
      return NextResponse.json({ 
        error: 'Nom, prix et au moins un item de menu sont requis' 
      }, { status: 400 });
    }

    // Récupérer le restaurant de l'utilisateur
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Vérifier que tous les menu_items existent
    const menuIds = menu_items.map(item => item.menu_id);
    const { data: existingMenus, error: menusError } = await supabase
      .from('menus')
      .select('id')
      .in('id', menuIds);

    if (menusError || !existingMenus || existingMenus.length !== menuIds.length) {
      return NextResponse.json({ 
        error: 'Un ou plusieurs items de menu n\'existent pas' 
      }, { status: 400 });
    }

    // Créer la formule
    const { data: formula, error: formulaError } = await supabase
      .from('formulas')
      .insert([{
        restaurant_id: restaurant.id,
        nom: nom.trim(),
        description: description || '',
        prix: parseFloat(prix),
        prix_reduit: prix_reduit ? parseFloat(prix_reduit) : null,
        image_url: image_url || null,
        disponible: disponible !== false,
        category: 'formule'
      }])
      .select()
      .single();

    if (formulaError) {
      console.error('Erreur création formule:', formulaError);
      return NextResponse.json({ 
        error: 'Erreur lors de la création de la formule',
        details: formulaError.message 
      }, { status: 500 });
    }

    // Créer les formula_items
    const formulaItems = menu_items.map((item, index) => ({
      formula_id: formula.id,
      menu_id: item.menu_id,
      order_index: item.order_index !== undefined ? item.order_index : index,
      quantity: item.quantity || 1
    }));

    const { error: itemsError } = await supabase
      .from('formula_items')
      .insert(formulaItems);

    if (itemsError) {
      console.error('Erreur création formula_items:', itemsError);
      // Supprimer la formule créée en cas d'erreur
      await supabase.from('formulas').delete().eq('id', formula.id);
      return NextResponse.json({ 
        error: 'Erreur lors de la création des items de formule',
        details: itemsError.message 
      }, { status: 500 });
    }

    // Récupérer la formule complète avec ses items
    const { data: completeFormula, error: fetchError } = await supabase
      .from('formulas')
      .select(`
        *,
        formula_items:formula_items(
          id,
          order_index,
          quantity,
          menu:menus(
            id,
            nom,
            description,
            prix,
            image_url,
            category
          )
        )
      `)
      .eq('id', formula.id)
      .single();

    if (fetchError) {
      console.error('Erreur récupération formule complète:', fetchError);
    }

    return NextResponse.json({
      success: true,
      formula: completeFormula || formula,
      message: 'Formule créée avec succès'
    });
  } catch (error) {
    console.error('Erreur API création formule:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


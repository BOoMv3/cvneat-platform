import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET - Récupérer les suppléments d'un restaurant
export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Récupérer tous les suppléments depuis menu_supplements pour tous les menus du restaurant
    const { data: menus, error: menusError } = await supabase
      .from('menus')
      .select('id')
      .eq('restaurant_id', id)
      .eq('disponible', true);

    if (menusError) {
      console.warn('⚠️ Erreur récupération menus:', menusError);
    }

    const menuIds = menus && menus.length > 0 ? menus.map(m => m.id) : [];

    // Récupérer les suppléments depuis menu_supplements (EXCLURE les boissons)
    let allSupplements = [];
    if (menuIds.length > 0) {
      const { data: menuSupplements, error: menuSupplementsError } = await supabase
        .from('menu_supplements')
        .select('*')
        .in('menu_item_id', menuIds)
        .eq('disponible', true)
        .order('ordre');
      
      // Exclure les boissons des suppléments (les boissons sont gérées via drink_options)
      // Vérifier si le supplément correspond à un menu avec is_drink = true
      if (!menuSupplementsError && menuSupplements && menuSupplements.length > 0) {
        // Récupérer les IDs des menus qui sont des boissons
        const { data: drinkMenus, error: drinkMenusError } = await supabase
          .from('menus')
          .select('id')
          .eq('restaurant_id', id)
          .eq('is_drink', true)
          .eq('disponible', true);
        
        const drinkMenuIds = drinkMenus && drinkMenus.length > 0 
          ? new Set(drinkMenus.map(d => d.id)) 
          : new Set();
        
        // Filtrer les suppléments pour exclure ceux qui correspondent à des boissons
        const filteredMenuSupplements = menuSupplements.filter(ms => {
          // Si le menu_item_id du supplément correspond à un menu boisson, l'exclure
          return !drinkMenuIds.has(ms.menu_item_id);
        });
        
        allSupplements = filteredMenuSupplements.map(ms => ({
          id: ms.id,
          nom: ms.nom || ms.name || 'Supplément',
          name: ms.nom || ms.name || 'Supplément',
          prix: parseFloat(ms.prix || ms.price || 0),
          price: parseFloat(ms.prix || ms.price || 0),
          description: ms.description || '',
          disponible: ms.disponible !== false,
          menu_item_id: ms.menu_item_id
        }));
        console.log(`✅ Suppléments récupérés depuis menu_supplements pour restaurant ${id}: ${allSupplements.length} (boissons exclues)`);
      }
    }

    // Essayer aussi avec la table 'supplements' (format standard) et combiner
    const { data: supplementsData, error: supplementsError } = await supabase
      .from('supplements')
      .select('*')
      .eq('restaurant_id', id)
      .eq('is_active', true)
      .order('name');

    if (!supplementsError && supplementsData && supplementsData.length > 0) {
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
      // Combiner avec les suppléments de menu_supplements (éviter les doublons)
      const existingIds = new Set(allSupplements.map(s => s.id));
      formattedSupplements.forEach(sup => {
        if (!existingIds.has(sup.id)) {
          allSupplements.push(sup);
        }
      });
      console.log(`✅ Suppléments combinés (supplements + menu_supplements) pour restaurant ${id}:`, allSupplements.length);
    }

    // Retourner tous les suppléments trouvés
    return NextResponse.json(allSupplements);
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

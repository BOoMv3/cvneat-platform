import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// PUT /api/partner/formulas/[id] - Mettre à jour une formule
export async function PUT(request, { params }) {
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
      menu_items = null // Array of { menu_id, order_index, quantity } ou null pour ne pas modifier
    } = body;

    if (!nom || prix === undefined) {
      return NextResponse.json({ 
        error: 'Nom et prix sont requis' 
      }, { status: 400 });
    }

    // Vérifier que la formule existe et appartient au restaurant de l'utilisateur
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    const { data: existingFormula, error: fetchError } = await supabase
      .from('formulas')
      .select('id, restaurant_id')
      .eq('id', params.id)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (fetchError || !existingFormula) {
      return NextResponse.json({ 
        error: 'Formule non trouvée ou accès refusé' 
      }, { status: 404 });
    }

    // Mettre à jour la formule
    const updateData = {
      nom: nom.trim(),
      description: description || '',
      prix: parseFloat(prix),
      disponible: disponible !== false
    };

    if (prix_reduit !== null && prix_reduit !== undefined) {
      updateData.prix_reduit = parseFloat(prix_reduit);
    }

    if (image_url !== null && image_url !== undefined) {
      updateData.image_url = image_url;
    }

    const { data: updatedFormula, error: updateError } = await supabase
      .from('formulas')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour formule:', updateError);
      return NextResponse.json({ 
        error: 'Erreur lors de la mise à jour de la formule',
        details: updateError.message 
      }, { status: 500 });
    }

    // Si menu_items est fourni, mettre à jour les items
    if (menu_items !== null && Array.isArray(menu_items)) {
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

      // Supprimer les anciens items
      const { error: deleteError } = await supabase
        .from('formula_items')
        .delete()
        .eq('formula_id', params.id);

      if (deleteError) {
        console.error('Erreur suppression anciens items:', deleteError);
        return NextResponse.json({ 
          error: 'Erreur lors de la mise à jour des items',
          details: deleteError.message 
        }, { status: 500 });
      }

      // Créer les nouveaux items
      const formulaItems = menu_items.map((item, index) => ({
        formula_id: params.id,
        menu_id: item.menu_id,
        order_index: item.order_index !== undefined ? item.order_index : index,
        quantity: item.quantity || 1
      }));

      const { error: itemsError } = await supabase
        .from('formula_items')
        .insert(formulaItems);

      if (itemsError) {
        console.error('Erreur création nouveaux items:', itemsError);
        return NextResponse.json({ 
          error: 'Erreur lors de la création des nouveaux items',
          details: itemsError.message 
        }, { status: 500 });
      }
    }

    // Récupérer la formule complète avec ses items
    const { data: completeFormula, error: fetchCompleteError } = await supabase
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
      .eq('id', params.id)
      .single();

    if (fetchCompleteError) {
      console.error('Erreur récupération formule complète:', fetchCompleteError);
    }

    return NextResponse.json({
      success: true,
      formula: completeFormula || updatedFormula,
      message: 'Formule mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur API mise à jour formule:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/partner/formulas/[id] - Supprimer une formule
export async function DELETE(request, { params }) {
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

    // Vérifier que la formule existe et appartient au restaurant de l'utilisateur
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    const { data: existingFormula, error: fetchError } = await supabase
      .from('formulas')
      .select('id, restaurant_id')
      .eq('id', params.id)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (fetchError || !existingFormula) {
      return NextResponse.json({ 
        error: 'Formule non trouvée ou accès refusé' 
      }, { status: 404 });
    }

    // Supprimer la formule (les formula_items seront supprimés automatiquement via CASCADE)
    const { error: deleteError } = await supabase
      .from('formulas')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Erreur suppression formule:', deleteError);
      return NextResponse.json({ 
        error: 'Erreur lors de la suppression de la formule',
        details: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Formule supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur API suppression formule:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}


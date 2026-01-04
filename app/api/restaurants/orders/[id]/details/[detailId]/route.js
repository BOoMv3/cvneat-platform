import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// PUT /api/restaurants/orders/[id]/details/[detailId] - Modifier les détails d'une commande (retirer des ingrédients)
export async function PUT(request, { params }) {
  try {
    const { id: orderId, detailId } = params;
    const body = await request.json();
    const { removedIngredients } = body; // Liste des IDs d'ingrédients/viandes à retirer

    console.log('=== MODIFICATION DÉTAILS COMMANDE ===');
    console.log('Order ID:', orderId);
    console.log('Detail ID:', detailId);
    console.log('Ingrédients à retirer:', removedIngredients);

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un restaurant
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (userDataError || !userData || userData.role !== 'restaurant') {
      return NextResponse.json({ error: 'Accès non autorisé - Restaurant requis' }, { status: 403 });
    }

    // Vérifier que la commande existe et appartient au restaurant
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('id, restaurant_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurant || order.restaurant_id !== restaurant.id) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Vérifier que le détail existe
    const { data: detail, error: detailError } = await supabaseAdmin
      .from('details_commande')
      .select('*')
      .eq('id', detailId)
      .eq('commande_id', orderId)
      .single();

    if (detailError || !detail) {
      return NextResponse.json({ error: 'Détail de commande non trouvé' }, { status: 404 });
    }

    // Parser les customizations existantes
    let customizations = {};
    if (detail.customizations) {
      if (typeof detail.customizations === 'string') {
        try {
          customizations = JSON.parse(detail.customizations);
        } catch (e) {
          customizations = {};
        }
      } else {
        customizations = detail.customizations;
      }
    }

    // Retirer les ingrédients/viandes spécifiés
    if (removedIngredients && Array.isArray(removedIngredients)) {
      // Retirer des selectedMeats si présent
      if (customizations.selectedMeats && Array.isArray(customizations.selectedMeats)) {
        customizations.selectedMeats = customizations.selectedMeats.filter(meat => {
          const meatId = meat.id || meat.nom || meat.name;
          return !removedIngredients.includes(meatId);
        });
      }

      // Retirer des selectedSauces si présent
      if (customizations.selectedSauces && Array.isArray(customizations.selectedSauces)) {
        customizations.selectedSauces = customizations.selectedSauces.filter(sauce => {
          const sauceId = sauce.id || sauce.nom || sauce.name;
          return !removedIngredients.includes(sauceId);
        });
      }

      // Ajouter aux removedIngredients si pas déjà présent
      if (!customizations.removedIngredients) {
        customizations.removedIngredients = [];
      }
      removedIngredients.forEach(ingId => {
        if (!customizations.removedIngredients.some(ing => (ing.id || ing.nom || ing.name) === ingId)) {
          customizations.removedIngredients.push({ id: ingId, nom: ingId });
        }
      });
    }

    // Mettre à jour le détail
    const { data: updatedDetail, error: updateError } = await supabaseAdmin
      .from('details_commande')
      .update({
        customizations: customizations,
        updated_at: new Date().toISOString()
      })
      .eq('id', detailId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour détail:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    console.log('✅ Détail mis à jour avec succès');

    return NextResponse.json({
      success: true,
      detail: updatedDetail
    });

  } catch (error) {
    console.error('❌ Erreur API modification détails commande:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error.message
    }, { status: 500 });
  }
}


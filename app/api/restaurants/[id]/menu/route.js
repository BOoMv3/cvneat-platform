import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const { data: menus, error } = await supabase
      .from('menus')
      .select('*')
      .eq('restaurant_id', id)
      .eq('disponible', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur récupération menu:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Transformer les données pour correspondre au format attendu par le frontend
    const transformedMenu = menus?.map(item => {
      // Parser les suppléments si présents (JSONB ou string)
      let supplements = [];
      if (item.supplements) {
        if (typeof item.supplements === 'string') {
          try {
            supplements = JSON.parse(item.supplements);
          } catch (e) {
            console.warn('Erreur parsing supplements string:', e);
            supplements = [];
          }
        } else if (Array.isArray(item.supplements)) {
          supplements = item.supplements;
        }
      }

      // Parser les options de viande
      let meatOptions = [];
      if (item.meat_options) {
        if (typeof item.meat_options === 'string') {
          try {
            meatOptions = JSON.parse(item.meat_options);
          } catch (e) {
            meatOptions = [];
          }
        } else if (Array.isArray(item.meat_options)) {
          meatOptions = item.meat_options;
        }
      }

      // Parser les options de sauce
      let sauceOptions = [];
      if (item.sauce_options) {
        if (typeof item.sauce_options === 'string') {
          try {
            sauceOptions = JSON.parse(item.sauce_options);
          } catch (e) {
            sauceOptions = [];
          }
        } else if (Array.isArray(item.sauce_options)) {
          sauceOptions = item.sauce_options;
        }
      }

      // Parser les ingrédients de base
      let baseIngredients = [];
      if (item.base_ingredients) {
        if (typeof item.base_ingredients === 'string') {
          try {
            baseIngredients = JSON.parse(item.base_ingredients);
          } catch (e) {
            baseIngredients = [];
          }
        } else if (Array.isArray(item.base_ingredients)) {
          baseIngredients = item.base_ingredients;
        }
      }
      
      return {
        id: item.id,
        nom: item.nom,
        description: item.description,
        prix: item.prix,
        image_url: item.image_url,
        category: item.category || 'Autres',
        disponible: item.disponible,
        created_at: item.created_at,
        supplements: supplements, // Inclure les suppléments
        // Colonnes pour les boissons
        is_drink: item.is_drink || false,
        drink_size: item.drink_size || null,
        drink_price_small: item.drink_price_small || null,
        drink_price_medium: item.drink_price_medium || null,
        drink_price_large: item.drink_price_large || null,
        // Nouvelles colonnes de customisation
        meat_options: meatOptions,
        sauce_options: sauceOptions,
        base_ingredients: baseIngredients,
        requires_meat_selection: item.requires_meat_selection || false,
        requires_sauce_selection: item.requires_sauce_selection || false,
        max_sauces: item.max_sauces || item.max_sauce_count || null,
        max_meats: item.max_meats || item.max_meat_count || null
      };
    }) || [];

    return NextResponse.json(transformedMenu);
  } catch (error) {
    console.error('Erreur API menu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
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

    // Récupérer les formules disponibles
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
      .eq('restaurant_id', id)
      .eq('disponible', true)
      .order('created_at', { ascending: true });

    if (formulasError) {
      console.warn('Erreur récupération formules:', formulasError);
      // Ne pas bloquer si les formules ne peuvent pas être récupérées
    }

    // Transformer les données pour correspondre au format attendu par le frontend
    const transformedMenuPromises = (menus || []).map(async (item) => {
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
      
      // Récupérer les boissons disponibles pour ce menu (si drink_options est présent)
      let availableDrinks = [];
      if (item.drink_options && Array.isArray(item.drink_options) && item.drink_options.length > 0) {
        const { data: drinksData, error: drinksError } = await supabase
          .from('menus')
          .select('id, nom, description, prix, is_drink, drink_price_small, drink_price_medium, drink_price_large')
          .in('id', item.drink_options)
          .eq('disponible', true);

        if (!drinksError && drinksData) {
          availableDrinks = drinksData.map(drink => ({
            id: drink.id,
            nom: drink.nom,
            description: drink.description,
            prix: drink.prix,
            is_drink: drink.is_drink,
            drink_price_small: drink.drink_price_small,
            drink_price_medium: drink.drink_price_medium,
            drink_price_large: drink.drink_price_large
          }));
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
        drink_options: availableDrinks, // Boissons disponibles pour ce menu
        // Nouvelles colonnes de customisation
        meat_options: meatOptions,
        sauce_options: sauceOptions,
        base_ingredients: baseIngredients,
        requires_meat_selection: item.requires_meat_selection || false,
        requires_sauce_selection: item.requires_sauce_selection || false,
        max_sauces: item.max_sauces || item.max_sauce_count || null,
        max_meats: item.max_meats || item.max_meat_count || null
      };
    });

    const transformedMenu = await Promise.all(transformedMenuPromises);

    // Transformer les formules pour correspondre au format attendu
    const transformedFormulas = await Promise.all((formulas || []).map(async (formula) => {
      const items = (formula.formula_items || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map(item => ({
          id: item.id,
          order_index: item.order_index,
          quantity: item.quantity || 1,
          menu: item.menu
        }));

      // Récupérer les boissons disponibles pour cette formule
      let availableDrinks = [];
      if (formula.drink_options && Array.isArray(formula.drink_options) && formula.drink_options.length > 0) {
        const { data: drinksData, error: drinksError } = await supabase
          .from('menus')
          .select('id, nom, description, prix, is_drink, drink_price_small, drink_price_medium, drink_price_large')
          .in('id', formula.drink_options)
          .eq('disponible', true);

        if (!drinksError && drinksData) {
          availableDrinks = drinksData.map(drink => ({
            id: drink.id,
            nom: drink.nom,
            description: drink.description,
            prix: drink.prix,
            is_drink: drink.is_drink,
            drink_price_small: drink.drink_price_small,
            drink_price_medium: drink.drink_price_medium,
            drink_price_large: drink.drink_price_large
          }));
        }
      }

      return {
        id: formula.id,
        nom: formula.nom,
        description: formula.description || '',
        prix: formula.prix,
        prix_reduit: formula.prix_reduit,
        image_url: formula.image_url,
        category: 'formule',
        disponible: formula.disponible,
        created_at: formula.created_at,
        is_formula: true, // Marqueur pour identifier les formules
        formula_items: items, // Items de la formule
        drink_options: availableDrinks, // Boissons disponibles pour cette formule
        // Calculer le prix total des items individuels pour afficher l'économie
        total_items_price: items.reduce((sum, item) => {
          const itemPrice = item.menu?.prix || 0;
          const quantity = item.quantity || 1;
          return sum + (itemPrice * quantity);
        }, 0)
      };
    }));

    // Combiner les menus et les formules
    const allItems = [...transformedMenu, ...transformedFormulas];

    return NextResponse.json(allItems);
  } catch (error) {
    console.error('Erreur API menu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Récupérer les menus
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
            const parsed = JSON.parse(item.supplements);
            if (Array.isArray(parsed)) {
              supplements = parsed;
            } else if (parsed && typeof parsed === 'object') {
              // Si c'est un objet, essayer de le convertir en tableau
              supplements = Object.values(parsed);
            }
          } catch (e) {
            console.warn('Erreur parsing supplements string:', e);
            supplements = [];
          }
        } else if (Array.isArray(item.supplements)) {
          supplements = item.supplements;
        } else if (item.supplements && typeof item.supplements === 'object') {
          // Si c'est un objet JSONB, essayer de le convertir en tableau
          supplements = Object.values(item.supplements);
        }
      }
      
      // TOUJOURS essayer de récupérer depuis menu_supplements, même si la colonne supplements a des données
      // Cela permet de combiner les deux sources
      if (item.id) {
        try {
          const { data: menuSupplements, error: menuSupplementsError } = await supabase
            .from('menu_supplements')
            .select('*')
            .eq('menu_item_id', item.id)
            .eq('disponible', true)
            .order('ordre');
          
          if (!menuSupplementsError && menuSupplements && menuSupplements.length > 0) {
            const menuSupplementsFormatted = menuSupplements.map(ms => ({
              id: ms.id,
              nom: ms.nom || ms.name || 'Supplément',
              name: ms.nom || ms.name || 'Supplément',
              prix: parseFloat(ms.prix || ms.price || 0),
              price: parseFloat(ms.prix || ms.price || 0),
              description: ms.description || '',
              disponible: ms.disponible !== false
            }));
            
            // Combiner avec les suppléments de la colonne (éviter les doublons)
            const existingIds = new Set(supplements.map(s => s.id || s.nom));
            menuSupplementsFormatted.forEach(ms => {
              if (!existingIds.has(ms.id) && !existingIds.has(ms.nom)) {
                supplements.push(ms);
              }
            });
            
            console.log(`✅ Suppléments récupérés depuis menu_supplements pour ${item.nom}:`, menuSupplements.length, 'suppléments ajoutés, total:', supplements.length);
          } else if (menuSupplementsError) {
            console.warn(`⚠️ Erreur récupération menu_supplements pour ${item.nom}:`, menuSupplementsError.message);
          } else {
            console.log(`ℹ️ Aucun supplément trouvé dans menu_supplements pour ${item.nom}`);
          }
        } catch (err) {
          console.warn('⚠️ Erreur récupération menu_supplements:', err);
        }
      }
      
      console.log(`📊 Suppléments finaux pour ${item.nom}:`, supplements.length);

      // Fonction helper pour parser les options JSONB
      const parseJsonbArray = (value, name) => {
        if (!value) {
          console.log(`ℹ️ API ${item.nom} - ${name}: null/undefined`);
          return [];
        }
        if (Array.isArray(value)) {
          console.log(`✅ API ${item.nom} - ${name}: tableau de`, value.length, 'éléments');
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              console.log(`✅ API ${item.nom} - ${name}: parsé depuis string,`, parsed.length, 'éléments');
              return parsed;
            }
            console.warn(`⚠️ API ${item.nom} - ${name}: parsé mais pas un tableau`);
            return [];
          } catch (e) {
            console.warn(`⚠️ API ${item.nom} - Erreur parsing ${name} string:`, e);
            return [];
          }
        }
        // Si c'est un objet (JSONB de Supabase), essayer de le convertir
        if (typeof value === 'object' && value !== null) {
          // Double vérification: parfois Array.isArray peut retourner true même si typeof est 'object'
          if (Array.isArray(value)) {
            console.log(`✅ API ${item.nom} - ${name}: tableau (détecté via Array.isArray),`, value.length, 'éléments');
            return value;
          }
          // Vérifier si c'est un objet vide
          const keys = Object.keys(value);
          if (keys.length === 0) {
            console.warn(`⚠️ API ${item.nom} - ${name}: objet VIDE {}`);
            return [];
          }
          // Vérifier si c'est un objet avec des propriétés numériques (comme un tableau)
          if (keys.length > 0 && keys.every(k => !isNaN(parseInt(k)))) {
            // C'est probablement un tableau sérialisé comme objet
            const array = Object.values(value);
            console.log(`✅ API ${item.nom} - ${name}: converti depuis objet avec clés numériques,`, array.length, 'éléments');
            return array;
          }
          // Si c'est un objet avec une propriété qui contient un tableau
          const firstValue = Object.values(value)[0];
          if (Array.isArray(firstValue)) {
            console.log(`✅ API ${item.nom} - ${name}: converti depuis objet contenant tableau,`, firstValue.length, 'éléments');
            return firstValue;
          }
          // Si toutes les valeurs sont des objets (format {0: {...}, 1: {...}})
          const allValues = Object.values(value);
          if (allValues.length > 0 && allValues.every(v => typeof v === 'object' && v !== null)) {
            console.log(`✅ API ${item.nom} - ${name}: converti depuis objet avec valeurs objets,`, allValues.length, 'éléments');
            return allValues;
          }
          console.warn(`⚠️ API ${item.nom} - ${name}: objet non-tableau, type:`, typeof value, 'keys:', keys);
          return [];
        }
        console.warn(`⚠️ API ${item.nom} - ${name}: type inconnu:`, typeof value);
        return [];
      };

      // Parser les options de viande
      let meatOptions = parseJsonbArray(item.meat_options, 'meat_options');
      console.log(`✅ API Menu ${item.nom} - meat_options final:`, meatOptions.length, 'options');

      // Parser les options de sauce
      let sauceOptions = parseJsonbArray(item.sauce_options, 'sauce_options');
      console.log(`✅ API Menu ${item.nom} - sauce_options final:`, sauceOptions.length, 'options');

      // Parser les ingrédients de base
      let baseIngredients = parseJsonbArray(item.base_ingredients, 'base_ingredients');
      console.log(`✅ API Menu ${item.nom} - base_ingredients final:`, baseIngredients.length, 'ingrédients');
      
      // Récupérer les boissons disponibles pour ce menu (si drink_options est présent)
      let availableDrinks = [];
      if (item.drink_options && Array.isArray(item.drink_options) && item.drink_options.length > 0) {
        console.log(`🔍 Menu ${item.nom}: Récupération de ${item.drink_options.length} boissons`, item.drink_options);
        
        const { data: drinksData, error: drinksError } = await supabase
          .from('menus')
          .select('id, nom, description, prix, is_drink, drink_price_small, drink_price_medium, drink_price_large, disponible')
          .in('id', item.drink_options);

        if (drinksError) {
          console.error(`❌ Erreur récupération boissons pour ${item.nom}:`, drinksError);
        } else if (drinksData) {
          // Filtrer seulement les boissons disponibles
          const availableDrinksData = drinksData.filter(drink => drink.disponible !== false);
          console.log(`✅ ${availableDrinksData.length}/${drinksData.length} boissons disponibles pour ${item.nom}`);
          
          availableDrinks = availableDrinksData.map(drink => ({
            id: drink.id,
            nom: drink.nom,
            description: drink.description,
            prix: drink.prix,
            is_drink: drink.is_drink,
            drink_price_small: drink.drink_price_small,
            drink_price_medium: drink.drink_price_medium,
            drink_price_large: drink.drink_price_large
          }));
          
          // Log si certaines boissons ne sont pas disponibles
          if (availableDrinksData.length < drinksData.length) {
            const unavailable = drinksData.filter(d => d.disponible === false);
            console.warn(`⚠️ Boissons non disponibles pour ${item.nom}:`, unavailable.map(d => d.nom));
          }
        }
      } else if (item.nom && (item.nom.toLowerCase().includes('menu') || item.category?.toLowerCase().includes('menu'))) {
        console.warn(`⚠️ Menu ${item.nom} n'a pas de drink_options`);
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
        meat_options: Array.isArray(meatOptions) ? meatOptions : [],
        sauce_options: Array.isArray(sauceOptions) ? sauceOptions : [],
        base_ingredients: Array.isArray(baseIngredients) ? baseIngredients : [],
        requires_meat_selection: item.requires_meat_selection || false,
        requires_sauce_selection: item.requires_sauce_selection || false,
        max_sauces: item.max_sauces || item.max_sauce_count || null,
        max_meats: item.max_meats || item.max_meat_count || null
      };
    });

    const transformedMenu = await Promise.all(transformedMenuPromises);

    // Transformer les formules pour correspondre au format attendu
    const transformedFormulas = await Promise.all((formulas || []).map(async (formula) => {
      // Vérifier que formula_items existe et est un tableau
      if (!formula.formula_items || !Array.isArray(formula.formula_items) || formula.formula_items.length === 0) {
        console.warn(`⚠️ Formule ${formula.id} n'a pas de formula_items valides`);
        return null;
      }
      
      const items = formula.formula_items
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
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

    // Filtrer les formules invalides (null) avant de les combiner
    const validFormulas = transformedFormulas.filter(f => f !== null);
    
    // Combiner les menus et les formules
    const allItems = [...transformedMenu, ...validFormulas];

    return NextResponse.json(allItems);
  } catch (error) {
    console.error('Erreur API menu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
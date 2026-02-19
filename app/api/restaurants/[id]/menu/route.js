import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../../lib/supabase';

// IMPORTANT: menus/prix doivent être toujours à jour (éviter tout caching)
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Utiliser supabaseAdmin pour bypasser RLS et garantir le filtre disponible
    const db = supabaseAdmin || supabase;
    const { data: menus, error } = await db
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
    const { data: formulas, error: formulasError } = await db
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
            category,
            disponible
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
          const { data: menuSupplements, error: menuSupplementsError } = await (supabaseAdmin || supabase)
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
            
          }
        } catch (err) {
          // Ignorer les erreurs silencieusement
        }
      }

      // Fonction helper pour parser les options JSONB
      const parseJsonbArray = (value, name) => {
        if (!value) {
          return [];
        }
        if (Array.isArray(value)) {
          return value;
        }
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return parsed;
            }
            return [];
          } catch (e) {
            return [];
          }
        }
        // Si c'est un objet (JSONB de Supabase), essayer de le convertir
        if (typeof value === 'object' && value !== null) {
          // Double vérification: parfois Array.isArray peut retourner true même si typeof est 'object'
          if (Array.isArray(value)) {
            return value;
          }
          // Vérifier si c'est un objet vide
          const keys = Object.keys(value);
          if (keys.length === 0) {
            return [];
          }
          // Vérifier si c'est un objet avec des propriétés numériques (comme un tableau)
          if (keys.length > 0 && keys.every(k => !isNaN(parseInt(k)))) {
            // C'est probablement un tableau sérialisé comme objet
            return Object.values(value);
          }
          // Si c'est un objet avec une propriété qui contient un tableau
          const firstValue = Object.values(value)[0];
          if (Array.isArray(firstValue)) {
            return firstValue;
          }
          // Si toutes les valeurs sont des objets (format {0: {...}, 1: {...}})
          const allValues = Object.values(value);
          if (allValues.length > 0 && allValues.every(v => typeof v === 'object' && v !== null)) {
            return allValues;
          }
          return [];
        }
        return [];
      };

      // Parser les options de viande
      let meatOptions = parseJsonbArray(item.meat_options, 'meat_options');

      // Parser les options de sauce
      let sauceOptions = parseJsonbArray(item.sauce_options, 'sauce_options');

      // Parser les ingrédients de base
      let baseIngredients = parseJsonbArray(item.base_ingredients, 'base_ingredients');
      
      // Récupérer les boissons disponibles pour ce menu (si drink_options est présent)
      let availableDrinks = [];
      if (item.drink_options && Array.isArray(item.drink_options) && item.drink_options.length > 0) {
        console.log(`🔍 Menu ${item.nom}: Récupération de ${item.drink_options.length} boissons`, item.drink_options);
        
        const { data: drinksData, error: drinksError } = await (supabaseAdmin || supabase)
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

      // S'assurer que supplements est toujours un tableau
      const finalSupplements = Array.isArray(supplements) ? supplements : [];
      
      return {
        id: item.id,
        nom: item.nom,
        description: item.description,
        prix: item.prix,
        image_url: item.image_url,
        category: item.category || 'Autres',
        disponible: item.disponible,
        created_at: item.created_at,
        supplements: finalSupplements, // Inclure les suppléments (toujours un tableau)
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
      
      // Exclure les items dont le menu lié est indisponible
      const items = formula.formula_items
        .filter((item) => item.menu?.disponible !== false)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map(item => ({
          id: item.id,
          order_index: item.order_index,
          quantity: item.quantity || 1,
          menu: item.menu
        }));

      if (items.length === 0) {
        return null;
      }

      // Récupérer les boissons disponibles pour cette formule
      let availableDrinks = [];
      if (formula.drink_options && Array.isArray(formula.drink_options) && formula.drink_options.length > 0) {
        const { data: drinksData, error: drinksError } = await (supabaseAdmin || supabase)
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
    
    // Combiner les menus et les formules, en excluant tout item indisponible (sécurité)
    const allItems = [...transformedMenu, ...validFormulas].filter(
      (item) => item.disponible !== false
    );

    const res = NextResponse.json(allItems);
    // Empêcher caches (Vercel/CDN/navigateurs)
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (error) {
    console.error('Erreur API menu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../lib/supabase';
const { sanitizeInput, isValidAmount, isValidId } = require('@/lib/validation');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId'); // Changé de 'restaurant_id' à 'restaurantId'

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'ID du restaurant requis' },
        { status: 400 }
      );
    }

    const { data: menu, error } = await supabase
      .from('menus')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('disponible', { ascending: false })
      .order('category', { ascending: true })
      .order('nom', { ascending: true });

    if (error) {
      console.error('Erreur récupération menu:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du menu' },
        { status: 500 }
      );
    }

    return NextResponse.json(menu || [], {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Erreur API récupération menu:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('🔍 DEBUG API MENU - Début de la requête POST');
    
    // 1. Récupérer les données de la requête
    const {
      restaurant_id,
      nom,
      description,
      prix,
      category = 'Autres',
      user_email, // Ajout de l'email de l'utilisateur
      supplements = [], // Ajout des suppléments
      image_url, // Ajout de l'image
      boisson_taille,
      prix_taille,
      // Nouvelles options de customisation
      meat_options = [],
      sauce_options = [],
      base_ingredients = [],
      requires_meat_selection = false,
      requires_sauce_selection = false,
      max_sauces = null,
      max_meats = null,
      contains_alcohol = false,
    } = await request.json();

    if (!restaurant_id || !nom || !prix || !user_email) {
      console.log('❌ DEBUG API MENU - Données manquantes:', { restaurant_id, nom, prix, user_email });
      return NextResponse.json(
        { error: 'ID restaurant, nom, prix et email utilisateur sont requis' },
        { status: 400 }
      );
    }

    // Validation et sanitisation des données
    if (!isValidId(restaurant_id)) {
      return NextResponse.json(
        { error: 'ID restaurant invalide' },
        { status: 400 }
      );
    }

    if (!isValidAmount(prix)) {
      return NextResponse.json(
        { error: 'Prix invalide' },
        { status: 400 }
      );
    }

    // Sanitisation des inputs
    const sanitizedData = {
      nom: sanitizeInput(nom),
      description: sanitizeInput(description || ''),
      category: sanitizeInput(category || 'Autres')
    };

    // 2. Vérifier que l'utilisateur a le rôle restaurant
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', user_email)
      .single();

    if (userError || !userData || userData.role !== 'restaurant') {
      console.log('❌ DEBUG API MENU - Erreur rôle:', userError || 'Rôle incorrect:', userData?.role);
      return NextResponse.json({ error: 'Accès refusé - Rôle restaurant requis' }, { status: 403 });
    }
    
    console.log('✅ DEBUG API MENU - Rôle restaurant confirmé pour:', userData.id);

    // 3. Vérifier que l'utilisateur est propriétaire du restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .eq('user_id', userData.id)
      .single();

    if (restaurantError || !restaurant) {
      console.log('❌ DEBUG API MENU - Erreur restaurant:', restaurantError || 'Restaurant non trouvé');
      return NextResponse.json(
        { error: 'Restaurant non trouvé ou inactif' },
        { status: 404 }
      );
    }
    
    console.log('✅ DEBUG API MENU - Restaurant confirmé comme propriétaire');

    // Préparer les données à insérer
    const menuData = {
      restaurant_id,
      nom: sanitizedData.nom,
      description: sanitizedData.description,
      prix: parseFloat(prix),
      category: sanitizedData.category,
      disponible: true,
      contains_alcohol: contains_alcohol === true || contains_alcohol === 'true',
    };

    // Ajouter les suppléments si fournis (stocker en JSONB)
    if (supplements && Array.isArray(supplements) && supplements.length > 0) {
      // Nettoyer les suppléments : s'assurer que chaque supplément a nom et prix
      const cleanedSupplements = supplements.map(sup => ({
        nom: sup.nom || sup.name || '',
        prix: parseFloat(sup.prix || sup.price || 0)
      })).filter(sup => sup.nom && sup.prix >= 0);
      menuData.supplements = cleanedSupplements;
    }

    // Ajouter l'image si fournie
    if (image_url) {
      menuData.image_url = image_url;
    }

    // Ajouter les options de customisation (viandes, sauces, ingrédients de base)
    if (meat_options && Array.isArray(meat_options) && meat_options.length > 0) {
      const cleanedMeatOptions = meat_options.map(meat => ({
        id: meat.id || meat.nom || '',
        nom: meat.nom || meat.name || '',
        prix: parseFloat(meat.prix || meat.price || 0),
        default: meat.default === true,
        disponible: meat.disponible !== false // Par défaut, disponible si non spécifié
      })).filter(meat => meat.nom);
      menuData.meat_options = cleanedMeatOptions;
    }

    if (sauce_options && Array.isArray(sauce_options) && sauce_options.length > 0) {
      const cleanedSauceOptions = sauce_options.map(sauce => ({
        id: sauce.id || sauce.nom || '',
        nom: sauce.nom || sauce.name || '',
        prix: parseFloat(sauce.prix || sauce.price || 0),
        default: sauce.default === true
      })).filter(sauce => sauce.nom);
      menuData.sauce_options = cleanedSauceOptions;
    }

    if (base_ingredients && Array.isArray(base_ingredients) && base_ingredients.length > 0) {
      const cleanedBaseIngredients = base_ingredients.map(ing => ({
        id: ing.id || ing.nom || '',
        nom: ing.nom || ing.name || '',
        prix: parseFloat(ing.prix || ing.price || 0),
        removable: ing.removable !== false
      })).filter(ing => ing.nom);
      menuData.base_ingredients = cleanedBaseIngredients;
    }

    menuData.requires_meat_selection = requires_meat_selection === true;
    menuData.requires_sauce_selection = requires_sauce_selection === true;

    // Ajouter les limites de sauces et viandes
    if (max_sauces !== null && max_sauces !== undefined) {
      const maxSaucesNum = parseInt(max_sauces);
      // Accepter 0 (sauces déjà comprises) ou un nombre positif
      menuData.max_sauces = !isNaN(maxSaucesNum) && maxSaucesNum >= 0 ? maxSaucesNum : null;
    } else {
      menuData.max_sauces = null;
    }

    if (max_meats !== null && max_meats !== undefined) {
      const maxMeatsNum = parseInt(max_meats);
      menuData.max_meats = !isNaN(maxMeatsNum) && maxMeatsNum > 0 ? maxMeatsNum : null;
    } else {
      menuData.max_meats = null;
    }

    // Ajouter les tailles de boisson si fournies
    // Mapper boisson_taille vers drink_size et prix_taille vers les prix appropriés
    // IMPORTANT: boisson_taille peut être un nombre ou une chaîne, il faut le convertir en string
    const boissonTailleStr = boisson_taille !== null && boisson_taille !== undefined 
      ? String(boisson_taille).trim() 
      : '';
    
    if (boissonTailleStr !== '') {
      menuData.drink_size = boissonTailleStr;
      menuData.is_drink = true;
      
      // Si un prix de taille est fourni, le mettre dans la colonne correspondante
      const prixTailleStr = prix_taille !== null && prix_taille !== undefined 
        ? String(prix_taille).trim() 
        : '';
      
      if (prixTailleStr !== '') {
        const prixTailleNum = parseFloat(prixTailleStr);
        if (!isNaN(prixTailleNum) && prixTailleNum >= 0) {
          // Mapper selon la taille : petit -> small, moyen -> medium, grand -> large
          const tailleLower = boissonTailleStr.toLowerCase();
          if (tailleLower.includes('petit') || tailleLower.includes('small') || tailleLower.includes('33') || tailleLower.includes('33cl')) {
            menuData.drink_price_small = prixTailleNum;
          } else if (tailleLower.includes('moyen') || tailleLower.includes('medium') || tailleLower.includes('50') || tailleLower.includes('50cl')) {
            menuData.drink_price_medium = prixTailleNum;
          } else if (tailleLower.includes('grand') || tailleLower.includes('large') || tailleLower.includes('1l') || tailleLower.includes('1 l')) {
            menuData.drink_price_large = prixTailleNum;
          } else {
            // Si la taille n'est pas reconnue, mettre le prix par défaut dans small
            // Cela permet de supporter les tailles personnalisées comme "75cl", "2L", etc.
            menuData.drink_price_small = prixTailleNum;
          }
        }
      }
    }

    console.log('📦 DEBUG API MENU - Données à insérer:', JSON.stringify(menuData, null, 2));
    console.log('📦 DEBUG API MENU - Suppléments:', JSON.stringify(supplements, null, 2));

    const { data: menuItem, error: menuError } = await supabase
      .from('menus')
      .insert([menuData])
      .select()
      .single();

    if (menuError) {
      console.error('❌ Erreur création menu:', menuError);
      console.error('❌ Détails erreur:', JSON.stringify(menuError, null, 2));
      // Vérifier si l'erreur est due à des colonnes manquantes
      if (menuError.message && menuError.message.includes('column') && menuError.message.includes('not found')) {
        return NextResponse.json(
          { 
            error: 'Colonnes manquantes dans la base de données',
            details: 'Les colonnes max_sauces et/ou max_meats n\'existent pas. Veuillez exécuter le script SQL add-max-limits-to-menus.sql',
            sqlError: menuError.message,
            code: menuError.code
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { 
          error: 'Erreur lors de la création de l\'item de menu',
          details: menuError.message || 'Erreur inconnue',
          code: menuError.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      menuItem,
      message: 'Item de menu créé avec succès'
    });
  } catch (error) {
    console.error('Erreur API création menu:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { 
      id, 
      nom, 
      description = '', 
      prix, 
      image_url = null, 
      disponible = true, 
      category = 'Autres',
      supplements = [],
      boisson_taille = null,
      prix_taille = null,
      // Nouvelles options de customisation
      meat_options = null,
      sauce_options = null,
      base_ingredients = null,
      requires_meat_selection = null,
      requires_sauce_selection = null,
      max_sauces = null,
      max_meats = null,
      contains_alcohol = null,
    } = body;

    if (!id || !nom || prix === undefined) {
      return NextResponse.json({ 
        error: 'Menu ID, nom et prix sont requis' 
      }, { status: 400 });
    }

    // Validation du prix
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum < 0) {
      return NextResponse.json({ 
        error: 'Prix invalide' 
      }, { status: 400 });
    }

    // Préparer les données à mettre à jour
    const updateData = {
      nom: nom.trim(),
      description: description || '',
      prix: prixNum,
      disponible: disponible !== false,
      category: category || 'Autres',
    };

    if (contains_alcohol !== null && contains_alcohol !== undefined) {
      updateData.contains_alcohol = contains_alcohol === true || contains_alcohol === 'true';
    }

    // Ajouter l'image si fournie
    if (image_url !== null && image_url !== undefined) {
      updateData.image_url = image_url;
    } else if (image_url === null) {
      updateData.image_url = null;
    }

    // Ajouter les suppléments si fournis (stocker en JSONB)
    if (supplements !== undefined) {
      // Nettoyer les suppléments : s'assurer que chaque supplément a nom et prix
      const cleanedSupplements = Array.isArray(supplements) 
        ? supplements.map(sup => {
            const nom = sup.nom || sup.name || '';
            const prix = parseFloat(sup.prix || sup.price || 0);
            return { nom: nom.trim(), prix: prix >= 0 ? prix : 0 };
          }).filter(sup => sup.nom && sup.prix >= 0)
        : [];
      updateData.supplements = cleanedSupplements;
    }

    // Ajouter les tailles de boisson si fournies
    // Ajouter les options de customisation (viandes, sauces, ingrédients de base)
    if (meat_options !== null && meat_options !== undefined) {
      if (Array.isArray(meat_options) && meat_options.length > 0) {
        const cleanedMeatOptions = meat_options.map(meat => ({
          id: meat.id || meat.nom || '',
          nom: meat.nom || meat.name || '',
          prix: parseFloat(meat.prix || meat.price || 0),
          default: meat.default === true,
          disponible: meat.disponible !== false // Par défaut, disponible si non spécifié
        })).filter(meat => meat.nom);
        updateData.meat_options = cleanedMeatOptions;
      } else {
        updateData.meat_options = [];
      }
    }

    if (sauce_options !== null && sauce_options !== undefined) {
      if (Array.isArray(sauce_options) && sauce_options.length > 0) {
        const cleanedSauceOptions = sauce_options.map(sauce => ({
          id: sauce.id || sauce.nom || '',
          nom: sauce.nom || sauce.name || '',
          prix: parseFloat(sauce.prix || sauce.price || 0),
          default: sauce.default === true
        })).filter(sauce => sauce.nom);
        updateData.sauce_options = cleanedSauceOptions;
      } else {
        updateData.sauce_options = [];
      }
    }

    if (base_ingredients !== null && base_ingredients !== undefined) {
      if (Array.isArray(base_ingredients) && base_ingredients.length > 0) {
        const cleanedBaseIngredients = base_ingredients.map(ing => ({
          id: ing.id || ing.nom || '',
          nom: ing.nom || ing.name || '',
          prix: parseFloat(ing.prix || ing.price || 0),
          removable: ing.removable !== false
        })).filter(ing => ing.nom);
        updateData.base_ingredients = cleanedBaseIngredients;
      } else {
        updateData.base_ingredients = [];
      }
    }

    if (requires_meat_selection !== null && requires_meat_selection !== undefined) {
      updateData.requires_meat_selection = requires_meat_selection === true;
    }

    if (requires_sauce_selection !== null && requires_sauce_selection !== undefined) {
      updateData.requires_sauce_selection = requires_sauce_selection === true;
    }

    // Ajouter les limites de sauces et viandes
    if (max_sauces !== null && max_sauces !== undefined) {
      const maxSaucesNum = parseInt(max_sauces);
      // Accepter 0 (sauces déjà comprises) ou un nombre positif
      updateData.max_sauces = !isNaN(maxSaucesNum) && maxSaucesNum >= 0 ? maxSaucesNum : null;
    } else if (max_sauces === null) {
      // Permettre de réinitialiser à null explicitement
      updateData.max_sauces = null;
    }

    if (max_meats !== null && max_meats !== undefined) {
      const maxMeatsNum = parseInt(max_meats);
      updateData.max_meats = !isNaN(maxMeatsNum) && maxMeatsNum > 0 ? maxMeatsNum : null;
    } else if (max_meats === null) {
      // Permettre de réinitialiser à null explicitement
      updateData.max_meats = null;
    }

    // Mapper boisson_taille vers drink_size et prix_taille vers les prix appropriés
    // IMPORTANT: boisson_taille peut être un nombre ou une chaîne, il faut le convertir en string
    const boissonTailleStr = boisson_taille !== null && boisson_taille !== undefined 
      ? String(boisson_taille).trim() 
      : '';
    
    if (boissonTailleStr !== '') {
      updateData.drink_size = boissonTailleStr;
      updateData.is_drink = true;
      
      // Si un prix de taille est fourni, le mettre dans la colonne correspondante
      const prixTailleStr = prix_taille !== null && prix_taille !== undefined 
        ? String(prix_taille).trim() 
        : '';
      
      if (prixTailleStr !== '') {
        const prixTailleNum = parseFloat(prixTailleStr);
        if (!isNaN(prixTailleNum) && prixTailleNum >= 0) {
          // Mapper selon la taille : petit -> small, moyen -> medium, grand -> large
          const tailleLower = boissonTailleStr.toLowerCase();
          if (tailleLower.includes('petit') || tailleLower.includes('small') || tailleLower.includes('33') || tailleLower.includes('33cl')) {
            updateData.drink_price_small = prixTailleNum;
          } else if (tailleLower.includes('moyen') || tailleLower.includes('medium') || tailleLower.includes('50') || tailleLower.includes('50cl')) {
            updateData.drink_price_medium = prixTailleNum;
          } else if (tailleLower.includes('grand') || tailleLower.includes('large') || tailleLower.includes('1l') || tailleLower.includes('1 l')) {
            updateData.drink_price_large = prixTailleNum;
          } else {
            // Si la taille n'est pas reconnue, mettre le prix par défaut dans small
            // Cela permet de supporter les tailles personnalisées comme "75cl", "2L", etc.
            updateData.drink_price_small = prixTailleNum;
          }
        }
      }
    } else {
      // Si la taille est supprimée, retirer le flag is_drink
      updateData.is_drink = false;
      updateData.drink_size = null;
      updateData.drink_price_small = null;
      updateData.drink_price_medium = null;
      updateData.drink_price_large = null;
    }

    console.log('📦 DEBUG API MENU PUT - Données à mettre à jour:', JSON.stringify(updateData, null, 2));

    const { data, error } = await supabase
      .from('menus')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur Supabase PUT:', error);
      // Vérifier si l'erreur est due à des colonnes manquantes
      if (error.message && error.message.includes('column') && error.message.includes('not found')) {
        return NextResponse.json(
          { 
            error: 'Colonnes manquantes dans la base de données',
            details: 'Les colonnes max_sauces et/ou max_meats n\'existent pas. Veuillez exécuter le script SQL add-max-limits-to-menus.sql',
            sqlError: error.message
          },
          { status: 500 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Erreur mise à jour menu:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la mise à jour du menu',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { id, disponible, user_email } = await request.json();

    if (!id || !user_email) {
      return NextResponse.json(
        { error: 'ID du plat et email utilisateur requis' },
        { status: 400 }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', user_email)
      .single();

    if (userError || !userData || userData.role !== 'restaurant') {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle restaurant requis' },
        { status: 403 }
      );
    }

    const { data: menuItem, error: menuError } = await supabase
      .from('menus')
      .select('id, restaurant_id')
      .eq('id', id)
      .single();

    if (menuError || !menuItem) {
      return NextResponse.json(
        { error: 'Plat introuvable' },
        { status: 404 }
      );
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', menuItem.restaurant_id)
      .eq('user_id', userData.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Accès refusé à ce restaurant' },
        { status: 403 }
      );
    }

    const db = supabaseAdmin || supabase;
    const { data, error } = await db
      .from('menus')
      .update({ disponible: disponible !== false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, menu: data });
  } catch (error) {
    console.error('❌ Erreur PATCH menu:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la mise à jour de la disponibilité' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get('id');

    if (!menuId) {
      return NextResponse.json({ error: 'Menu ID requis' }, { status: 400 });
    }

    const { error } = await supabase
      .from('menus')
      .delete()
      .eq('id', menuId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression menu:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du menu' },
      { status: 500 }
    );
  }
} 
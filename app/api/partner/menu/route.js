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
      .eq('disponible', true)
      .order('category', { ascending: true })
      .order('nom', { ascending: true });

    if (error) {
      console.error('Erreur récupération menu:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du menu' },
        { status: 500 }
      );
    }

    return NextResponse.json(menu || []);
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
      prix_taille
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
      disponible: true
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

    // Ajouter les tailles de boisson si fournies
    // Mapper boisson_taille vers drink_size et prix_taille vers les prix appropriés
    if (boisson_taille && boisson_taille.trim() !== '') {
      menuData.drink_size = boisson_taille.trim();
      menuData.is_drink = true;
      
      // Si un prix de taille est fourni, le mettre dans la colonne correspondante
      if (prix_taille && prix_taille !== '') {
        const prixTailleNum = parseFloat(prix_taille);
        if (!isNaN(prixTailleNum) && prixTailleNum >= 0) {
          // Mapper selon la taille : petit -> small, moyen -> medium, grand -> large
          const tailleLower = boisson_taille.toLowerCase().trim();
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
      prix_taille = null
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
      category: category || 'Autres'
    };

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
    // Mapper boisson_taille vers drink_size et prix_taille vers les prix appropriés
    if (boisson_taille !== null && boisson_taille !== undefined && boisson_taille.trim() !== '') {
      updateData.drink_size = boisson_taille.trim();
      updateData.is_drink = true;
      
      // Si un prix de taille est fourni, le mettre dans la colonne correspondante
      if (prix_taille !== null && prix_taille !== undefined && prix_taille !== '') {
        const prixTailleNum = parseFloat(prix_taille);
        if (!isNaN(prixTailleNum) && prixTailleNum >= 0) {
          // Mapper selon la taille : petit -> small, moyen -> medium, grand -> large
          const tailleLower = boisson_taille.toLowerCase().trim();
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
    } else if (boisson_taille === null || boisson_taille === '' || boisson_taille === undefined) {
      // Si la taille est supprimée, retirer le flag is_drink
      updateData.is_drink = false;
      updateData.drink_size = null;
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
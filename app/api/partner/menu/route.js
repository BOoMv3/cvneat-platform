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
    if (boisson_taille) {
      menuData.boisson_taille = boisson_taille;
    }
    if (prix_taille) {
      menuData.prix_taille = parseFloat(prix_taille);
    }

    console.log('📦 DEBUG API MENU - Données à insérer:', JSON.stringify(menuData, null, 2));
    console.log('📦 DEBUG API MENU - Suppléments:', JSON.stringify(supplements, null, 2));

    const { data: menuItem, error: menuError } = await supabase
      .from('menus')
      .insert([menuData])
      .select()
      .single();

    if (menuError) {
      console.error('Erreur création menu:', menuError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'item de menu' },
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
    const { 
      id, 
      nom, 
      description, 
      prix, 
      image_url, 
      disponible, 
      category,
      supplements = [],
      boisson_taille,
      prix_taille
    } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Menu ID requis' }, { status: 400 });
    }

    // Préparer les données à mettre à jour
    const updateData = {
      nom,
      description,
      prix: parseFloat(prix),
      disponible,
      category
    };

    // Ajouter l'image si fournie
    if (image_url !== undefined) {
      updateData.image_url = image_url;
    }

    // Ajouter les suppléments si fournis (stocker en JSONB)
    if (supplements !== undefined) {
      // Nettoyer les suppléments : s'assurer que chaque supplément a nom et prix
      const cleanedSupplements = Array.isArray(supplements) 
        ? supplements.map(sup => ({
            nom: sup.nom || sup.name || '',
            prix: parseFloat(sup.prix || sup.price || 0)
          })).filter(sup => sup.nom && sup.prix >= 0)
        : [];
      updateData.supplements = cleanedSupplements;
    }

    // Ajouter les tailles de boisson si fournies
    if (boisson_taille !== undefined) {
      updateData.boisson_taille = boisson_taille;
    }
    if (prix_taille !== undefined) {
      updateData.prix_taille = parseFloat(prix_taille);
    }

    console.log('📦 DEBUG API MENU PUT - Données à mettre à jour:', JSON.stringify(updateData, null, 2));
    console.log('📦 DEBUG API MENU PUT - Suppléments:', JSON.stringify(supplements, null, 2));

    const { data, error } = await supabase
      .from('menus')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur mise à jour menu:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du menu' },
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
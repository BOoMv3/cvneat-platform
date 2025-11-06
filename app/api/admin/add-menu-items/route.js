import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Utiliser la clé de service pour les opérations admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fonction de vérification admin
const verifyAdminToken = async (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Token manquant', status: 401 };
    }

    const token = authHeader.split(' ')[1];
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return { error: 'Token invalide', status: 401 };
    }

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role, id')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return { error: 'Accès non autorisé - Admin requis', status: 403 };
    }

    return { userId: userData.id, userRole: userData.role };
  } catch (error) {
    console.error('Erreur vérification admin:', error);
    return { error: 'Erreur d\'authentification', status: 500 };
  }
};

// Menu SMAASH BURGER
const SMAASH_MENU = [
  // ===== BURGERS =====
  {
    nom: 'Classic Smaash Burger',
    description: 'Double steak smaashés, double cheddar, salade, sauce BBQ et moutarde américaine',
    prix: 13.50,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop'
  },
  {
    nom: 'Classic Smaash Bacon',
    description: 'Double steak smaashés, double cheddar, salade, poitrine grillée, sauce spicy ou sauce BBQ et moutarde américaine',
    prix: 15.50,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1000&auto=format&fit=crop'
  },
  {
    nom: 'Le Montagnard',
    description: 'Steak façon bouchère (150gr), jambon speck, reblochon de Savoie, confit d\'oignons, sauce persillade',
    prix: 16.50,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1528607929212-2636ec44253e?q=80&w=1000&auto=format&fit=crop'
  },
  {
    nom: 'Le Spicy Crispy Chicken',
    description: 'Filet de poulet crispy, poitrine grillée, cheddar, salade iceberg, oignons rouges, crispy oignons, sauce spicy',
    prix: 16.00,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1606755962773-d324e166a853?q=80&w=1000&auto=format&fit=crop'
  },
  {
    nom: 'Le CVNOL',
    description: 'Steak façon bouchère (150gr), crème de chèvre, cheddar, oignons confits, salade, sauce persillade',
    prix: 16.50,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1530554764233-e79e16c91d08?q=80&w=1000&auto=format&fit=crop'
  },
  {
    nom: 'L\'All Black',
    description: 'Steak 180gr VBF, bun\'s à l\'encre de seiche, galette de pomme de terre, fromage bleu d\'Auvergne, salade, oignons crispy',
    prix: 17.00,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?q=80&w=1000&auto=format&fit=crop'
  },
  
  // ===== POKE BOWL =====
  {
    nom: 'Poke bowl Saumon',
    description: 'Riz vinaigré, Avocat, concombre, édamamé, carotte, fruit de saison, graine de sésame, sauce soja',
    prix: 16.50,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=1000&auto=format&fit=crop'
  },
  {
    nom: 'Poke Bowl Spicy Crispy Chicken',
    description: 'Riz vinaigré, Avocat, concombre, édamamé, carotte, fruit de saison, graine de sésame, sauce soja',
    prix: 16.50,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1615367423057-4d29b1f68e44?q=80&w=1000&auto=format&fit=crop'
  },
  {
    nom: 'Poke Bowl Falafel',
    description: 'Riz vinaigré, Avocat, concombre, édamamé, carotte, fruit de saison, graine de sésame, sauce soja',
    prix: 15.50,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?q=80&w=1000&auto=format&fit=crop'
  },
  
  // ===== SALADES REPAS =====
  {
    nom: 'Salade de chèvre chaud',
    description: 'Jambon Spek, tomate, oignon, chèvre chaud',
    prix: 14.50,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?q=80&w=1000&auto=format&fit=crop'
  },
  {
    nom: 'Salade césar',
    description: 'Tomate, oeuf, parmesan, poulet crispy, croutons, sauce césar',
    prix: 14.50,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?q=80&w=1000&auto=format&fit=crop'
  },
  {
    nom: 'Salade de poulpe',
    description: 'Tomate, tapenade de poivrons rouges, poulpe grillé, croutons, olives',
    prix: 15.50,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000&auto=format&fit=crop'
  },
  {
    nom: 'Salade camembert',
    description: 'Tomate, oignons, toasts, camembert rôti, jambon cru',
    prix: 16.00,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000&auto=format&fit=crop'
  },
  
  // ===== MENU BAMBIN =====
  {
    nom: 'Menu Bambin',
    description: 'Burger, Cheese Burger ou Crispy tender (filet de poulet), Frites Fraîches, Sirop et compote',
    prix: 10.00,
    category: 'plat',
    image_url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?q=80&w=1000&auto=format&fit=crop'
  }
];

export async function POST(request) {
  try {
    // Vérifier l'authentification admin
    const auth = await verifyAdminToken(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { restaurantName, restaurantId } = await request.json();

    if (!restaurantName && !restaurantId) {
      return NextResponse.json(
        { error: 'Le nom du restaurant ou l\'ID est requis' },
        { status: 400 }
      );
    }

    let restaurant;

    // Trouver le restaurant par nom ou ID
    if (restaurantId) {
      const { data, error } = await supabaseAdmin
        .from('restaurants')
        .select('id, nom, user_id')
        .eq('id', restaurantId)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Restaurant non trouvé avec cet ID' },
          { status: 404 }
        );
      }
      restaurant = data;
    } else {
      // Rechercher par nom
      const { data, error } = await supabaseAdmin
        .from('restaurants')
        .select('id, nom, user_id')
        .ilike('nom', `%${restaurantName}%`)
        .limit(1)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: `Restaurant "${restaurantName}" non trouvé` },
          { status: 404 }
        );
      }
      restaurant = data;
    }

    // Vérifier les plats existants
    const { data: existingMenus } = await supabaseAdmin
      .from('menus')
      .select('id, nom')
      .eq('restaurant_id', restaurant.id);

    const existingNames = new Set((existingMenus || []).map(m => m.nom.toLowerCase()));

    // Préparer les plats à ajouter (exclure ceux qui existent déjà)
    const itemsToAdd = SMAASH_MENU.filter(item => !existingNames.has(item.nom.toLowerCase()));

    if (itemsToAdd.length === 0) {
      return NextResponse.json({
        message: 'Tous les plats existent déjà dans le menu',
        restaurant: {
          id: restaurant.id,
          nom: restaurant.nom
        },
        existingCount: existingMenus?.length || 0
      });
    }

    // Ajouter les plats
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const item of itemsToAdd) {
      try {
        const menuData = {
          restaurant_id: restaurant.id,
          nom: item.nom,
          description: item.description || '',
          prix: item.prix,
          category: item.category || 'plat',
          disponible: true,
          image_url: item.image_url || null
        };

        const { data, error } = await supabaseAdmin
          .from('menus')
          .insert([menuData])
          .select()
          .single();

        if (error) {
          errorCount++;
          results.push({ item: item.nom, status: 'error', error: error.message });
        } else {
          successCount++;
          results.push({ item: item.nom, status: 'success', id: data.id });
        }

        // Petit délai pour éviter les erreurs de taux
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (err) {
        errorCount++;
        results.push({ item: item.nom, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({
      message: `Ajout de ${itemsToAdd.length} plats au restaurant ${restaurant.nom}`,
      restaurant: {
        id: restaurant.id,
        nom: restaurant.nom
      },
      summary: {
        total: itemsToAdd.length,
        success: successCount,
        errors: errorCount,
        existing: existingMenus?.length || 0
      },
      results: results
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du menu:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}


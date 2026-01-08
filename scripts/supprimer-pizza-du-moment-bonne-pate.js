const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function supprimerPizzaDuMoment() {
  try {
    console.log('🔍 Recherche du restaurant "La Bonne Pâte"...');
    
    // 1. Trouver le restaurant - recherche plus large
    const { data: restaurants, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .ilike('nom', '%bonne%');

    if (restaurantError) {
      throw new Error(`Erreur recherche restaurant: ${restaurantError.message}`);
    }

    if (!restaurants || restaurants.length === 0) {
      // Lister tous les restaurants pour debug
      const { data: allRestaurants } = await supabaseAdmin
        .from('restaurants')
        .select('id, nom');
      console.log('\n📋 Tous les restaurants disponibles:');
      allRestaurants?.forEach(r => console.log(`  - ${r.nom} (ID: ${r.id})`));
      throw new Error('Restaurant "La Bonne Pâte" non trouvé');
    }

    // Filtrer pour trouver le bon restaurant
    const restaurant = restaurants.find(r => 
      r.nom.toLowerCase().includes('bonne') && (r.nom.toLowerCase().includes('pât') || r.nom.toLowerCase().includes('pate'))
    ) || restaurants[0];
    
    console.log(`✅ Restaurant trouvé: ${restaurant.nom} (ID: ${restaurant.id})\n`);

    // 2. Rechercher "pizza du moment" dans les catégories "Autres" et "Sélection spécial"
    console.log('🔍 Recherche de "pizza du moment" dans les catégories "Autres" et "Sélection spécial"...');
    
    // Rechercher dans tous les menus du restaurant (même indisponibles)
    const { data: allMenus, error: allMenusError } = await supabaseAdmin
      .from('menus')
      .select('id, nom, category, prix, disponible')
      .eq('restaurant_id', restaurant.id)
      .order('nom', { ascending: true });

    if (allMenusError) {
      throw new Error(`Erreur recherche menus: ${allMenusError.message}`);
    }

    // Afficher tous les items des catégories pertinentes pour debug
    const itemsAutres = allMenus?.filter(item => {
      const category = (item.category || '').toLowerCase();
      return category.includes('autre') || 
             category.includes('autres') || 
             category.includes('sélection spécial') ||
             category.includes('selection special') ||
             category.includes('selection spécial') ||
             category.includes('sélection special');
    }) || [];
    
    if (itemsAutres.length > 0) {
      console.log(`\n📋 Items dans les catégories "Autres" et "Sélection spécial" (${itemsAutres.length} items):`);
      itemsAutres.forEach(item => {
        console.log(`  - "${item.nom}" (${item.prix}€) - Catégorie: "${item.category}" - ${item.disponible ? '✅ Disponible' : '❌ Indisponible'} - ID: ${item.id}`);
      });
    } else {
      console.log('\n⚠️  Aucun item trouvé dans les catégories "Autres" ou "Sélection spécial"');
      console.log('\n📋 Toutes les catégories disponibles:');
      const categories = [...new Set(allMenus?.map(item => item.category || 'Sans catégorie') || [])];
      categories.forEach(cat => {
        const count = allMenus?.filter(item => (item.category || 'Sans catégorie') === cat).length || 0;
        console.log(`  - "${cat}" (${count} items)`);
      });
    }

    // Filtrer les items contenant "pizza" et "moment" dans les catégories "Autres" ou "Sélection spécial"
    const menuItems = allMenus?.filter(item => {
      const nom = item.nom.toLowerCase();
      const category = (item.category || '').toLowerCase();
      // Chercher "pizza du moment" dans les catégories "Autres" ou "Sélection spécial"
      const isInRelevantCategory = category.includes('autre') || 
                                   category.includes('autres') || 
                                   category.includes('sélection spécial') ||
                                   category.includes('selection special') ||
                                   category.includes('selection spécial') ||
                                   category.includes('sélection special');
      
      return isInRelevantCategory && (
        (nom.includes('pizza') && (nom.includes('moment') || nom.includes('jour'))) ||
        nom.includes('pizza du moment') ||
        nom === 'pizza du moment' ||
        nom === 'la pizza du moment'
      );
    }) || [];

    if (menuItems.length === 0) {
      console.log('\n⚠️  Aucune "pizza du moment" trouvée dans les menus');
      console.log('\n💡 Si elle est visible pour les clients mais pas dans le dashboard, elle pourrait être dans les menus composés.');
      
      // Vérifier aussi les menus composés
      const { data: combos, error: combosError } = await supabaseAdmin
        .from('menu_combos')
        .select('id, nom, description')
        .eq('restaurant_id', restaurant.id);

      if (!combosError && combos && combos.length > 0) {
        console.log(`\n📋 Menus composés (${combos.length}):`);
        combos.forEach(combo => {
          console.log(`  - ${combo.nom} - ID: ${combo.id}`);
        });
      }
      return;
    }

    console.log(`\n📋 Pizzas trouvées:`);
    menuItems.forEach(item => {
      console.log(`  - ${item.nom} (${item.prix}€) - ID: ${item.id}`);
    });

    // 3. Supprimer les pizzas trouvées
    console.log('\n🗑️  Suppression...');
    for (const item of menuItems) {
      const { error: deleteError } = await supabaseAdmin
        .from('menus')
        .delete()
        .eq('id', item.id);

      if (deleteError) {
        console.error(`❌ Erreur suppression "${item.nom}":`, deleteError.message);
      } else {
        console.log(`✅ "${item.nom}" supprimée avec succès`);
      }
    }

    console.log('\n✅ Opération terminée');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

supprimerPizzaDuMoment();


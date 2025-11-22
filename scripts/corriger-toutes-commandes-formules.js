/**
 * Script automatique pour corriger toutes les commandes avec formules sans détails
 * Usage: node scripts/corriger-toutes-commandes-formules.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  console.error('\n💡 Assurez-vous que le fichier .env.local existe et contient ces variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function corrigerToutesCommandesFormules() {
  console.log('🔍 Recherche des commandes sans détails du Cévenol Burger...\n');

  try {
    // 1. Trouver le restaurant Cévenol Burger
    const { data: restaurants, error: errorRestaurants } = await supabase
      .from('restaurants')
      .select('id, nom')
      .or('nom.ilike.%cévenol%,nom.ilike.%cevenol%')
      .limit(1);

    if (errorRestaurants || !restaurants || restaurants.length === 0) {
      console.error('❌ Restaurant Cévenol Burger non trouvé');
      return;
    }

    const restaurantCevenol = restaurants[0];
    console.log(`🏪 Restaurant trouvé: ${restaurantCevenol.nom} (ID: ${restaurantCevenol.id})\n`);

    // 2. Trouver toutes les commandes de ce restaurant
    const { data: commandesSansDetails, error: errorCommandes } = await supabase
      .from('commandes')
      .select(`
        id,
        created_at,
        total,
        statut,
        restaurant_id
      `)
      .eq('restaurant_id', restaurantCevenol.id);

    if (errorCommandes) {
      console.error('❌ Erreur récupération commandes:', errorCommandes);
      return;
    }

    if (errorCommandes) {
      console.error('❌ Erreur récupération commandes:', errorCommandes);
      return;
    }

    console.log(`📊 ${commandesSansDetails.length} commandes du Cévenol Burger trouvées\n`);

    // Vérifier lesquelles n'ont pas de détails
    const commandesACorriger = [];
    for (const commande of commandesSansDetails) {
      const { data: details, error: errorDetails } = await supabase
        .from('details_commande')
        .select('id')
        .eq('commande_id', commande.id)
        .limit(1);

      if (errorDetails) {
        console.error(`❌ Erreur vérification détails pour ${commande.id}:`, errorDetails);
        continue;
      }

      if (!details || details.length === 0) {
        commandesACorriger.push(commande);
      }
    }

    console.log(`🔧 ${commandesACorriger.length} commandes à corriger\n`);

    if (commandesACorriger.length === 0) {
      console.log('✅ Aucune commande à corriger !');
      return;
    }

    // 3. Récupérer toutes les formules du Cévenol Burger
    const restaurantId = restaurantCevenol.id;
    
    // D'abord, récupérer toutes les formules
    const { data: formulesBrutes, error: errorFormules } = await supabase
      .from('formulas')
      .select('id, nom, prix, drink_options')
      .eq('restaurant_id', restaurantId);

    if (errorFormules) {
      console.error('❌ Erreur récupération formules:', errorFormules);
      return;
    }

    console.log(`📦 ${formulesBrutes?.length || 0} formules trouvées (avant récupération éléments)\n`);

    // Pour chaque formule, récupérer ses éléments
    const formules = [];
    for (const formule of formulesBrutes || []) {
      const { data: formulaItems, error: errorItems } = await supabase
        .from('formula_items')
        .select('order_index, menu_id')
        .eq('formula_id', formule.id)
        .order('order_index');

      if (errorItems) {
        console.warn(`⚠️ Erreur récupération éléments pour formule ${formule.id}:`, errorItems);
        continue;
      }

      formules.push({
        ...formule,
        formula_items: formulaItems || []
      });
    }

    if (errorFormules) {
      console.error('❌ Erreur récupération formules:', errorFormules);
      return;
    }

    console.log(`📦 ${formules.length} formules trouvées\n`);

    if (formules.length === 0) {
      console.log('⚠️ Aucune formule trouvée pour ce restaurant');
      console.log('🔧 Solution alternative : création de détails génériques basés sur le prix\n');
      
      // Solution alternative : créer des détails avec des menus génériques
      // Récupérer les menus les plus courants du restaurant
      const { data: menus, error: errorMenus } = await supabase
        .from('menus')
        .select('id, nom, prix, is_drink')
        .eq('restaurant_id', restaurantId)
        .eq('disponible', true)
        .order('prix', { ascending: true })
        .limit(10);

      if (errorMenus || !menus || menus.length === 0) {
        console.error('❌ Impossible de récupérer les menus du restaurant');
        return;
      }

      // Trouver un burger, des frites et une boisson
      const burger = menus.find(m => !m.is_drink && (m.nom.toLowerCase().includes('burger') || m.nom.toLowerCase().includes('cheese'))) || menus.find(m => !m.is_drink);
      const frites = menus.find(m => !m.is_drink && (m.nom.toLowerCase().includes('frite') || m.nom.toLowerCase().includes('fries'))) || menus.find(m => !m.is_drink && m.id !== burger?.id);
      const boisson = menus.find(m => m.is_drink) || null;

      if (!burger) {
        console.error('❌ Impossible de trouver un menu burger');
        return;
      }

      console.log(`📦 Menus trouvés:`);
      console.log(`   🍔 ${burger.nom} (${burger.prix}€)`);
      if (frites) console.log(`   🍟 ${frites.nom} (${frites.prix}€)`);
      if (boisson) console.log(`   🥤 ${boisson.nom} (${boisson.prix}€)`);
      console.log('');

      // Créer des détails pour chaque commande
      let corrigees = 0;
      let erreurs = 0;

      for (const commande of commandesACorriger) {
        console.log(`\n🔧 Traitement commande ${commande.id.slice(0, 8)}...`);
        console.log(`   Total: ${commande.total}€`);

        const details = [];
        
        // Burger avec le prix total
        details.push({
          commande_id: commande.id,
          plat_id: burger.id,
          quantite: 1,
          prix_unitaire: parseFloat(commande.total),
          customizations: {
            is_formula_item: true,
            formula_name: 'Formule (reconstituée)',
            order_index: 0
          }
        });

        // Frites si disponibles
        if (frites) {
          details.push({
            commande_id: commande.id,
            plat_id: frites.id,
            quantite: 1,
            prix_unitaire: 0,
            customizations: {
              is_formula_item: true,
              formula_name: 'Formule (reconstituée)',
              order_index: 1
            }
          });
        }

        // Boisson si disponible
        if (boisson) {
          details.push({
            commande_id: commande.id,
            plat_id: boisson.id,
            quantite: 1,
            prix_unitaire: 0,
            customizations: {
              is_formula_drink: true,
              formula_name: 'Formule (reconstituée)'
            }
          });
        }

        // Insérer les détails
        const { data: insertedDetails, error: insertError } = await supabase
          .from('details_commande')
          .insert(details)
          .select();

        if (insertError) {
          console.error(`   ❌ Erreur insertion détails:`, insertError);
          erreurs++;
          continue;
        }

        console.log(`   ✅ ${insertedDetails.length} détails créés avec succès`);
        corrigees++;
      }

      console.log(`\n\n📊 RÉSUMÉ:`);
      console.log(`   ✅ Commandes corrigées: ${corrigees}`);
      console.log(`   ❌ Erreurs: ${erreurs}`);
      console.log(`   📦 Total traité: ${commandesACorriger.length}`);
      return;
    }

    // 4. Pour chaque commande, trouver la formule la plus probable
    let corrigees = 0;
    let erreurs = 0;

    for (const commande of commandesACorriger) {
      console.log(`\n🔧 Traitement commande ${commande.id.slice(0, 8)}...`);
      console.log(`   Total: ${commande.total}€`);
      console.log(`   Date: ${new Date(commande.created_at).toLocaleString('fr-FR')}`);

      // Trouver la formule qui correspond le mieux au prix
      const formuleProbable = formules.find(f => 
        Math.abs(parseFloat(f.prix) - parseFloat(commande.total)) < 0.50
      ) || formules.find(f => 
        Math.abs(parseFloat(f.prix) - parseFloat(commande.total)) < 2.00
      ) || formules[0]; // Par défaut, prendre la première formule

      if (!formuleProbable) {
        console.log(`   ⚠️ Aucune formule correspondante trouvée, utilisation de la première`);
        continue;
      }

      console.log(`   📦 Formule sélectionnée: ${formuleProbable.nom} (${formuleProbable.prix}€)`);

      // Préparer les détails de commande
      const details = [];
      let firstItem = true;

      // Trier les éléments de la formule par order_index
      const elementsFormule = (formuleProbable.formula_items || [])
        .filter(fi => fi.menu_id) // Filtrer les éléments valides
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

      // Récupérer les noms des menus pour l'affichage
      const menuIds = elementsFormule.map(fi => fi.menu_id);
      const { data: menus } = await supabase
        .from('menus')
        .select('id, nom')
        .in('id', menuIds);

      const menusMap = {};
      if (menus) {
        menus.forEach(m => menusMap[m.id] = m);
      }

      for (const element of elementsFormule) {
        if (!element.menu_id) {
          console.log(`   ⚠️ Élément sans menu_id ignoré`);
          continue;
        }

        const prixUnitaire = firstItem ? parseFloat(commande.total) : 0;
        const menuNom = menusMap[element.menu_id]?.nom || 'Menu inconnu';
        
        details.push({
          commande_id: commande.id,
          plat_id: element.menu_id,
          quantite: 1,
          prix_unitaire: prixUnitaire,
          customizations: {
            is_formula_item: true,
            formula_name: formuleProbable.nom,
            formula_id: formuleProbable.id,
            order_index: element.order_index || 0
          }
        });

        console.log(`   ✅ ${menuNom} (${prixUnitaire}€)`);
        firstItem = false;
      }

      // Ajouter une boisson par défaut si disponible
      if (formuleProbable.drink_options && Array.isArray(formuleProbable.drink_options) && formuleProbable.drink_options.length > 0) {
        // Prendre la première boisson disponible
        const drinkId = formuleProbable.drink_options[0];
        
        // Vérifier que c'est bien une boisson
        const { data: drinkMenu } = await supabase
          .from('menus')
          .select('id, nom, is_drink')
          .eq('id', drinkId)
          .single();

        if (drinkMenu && drinkMenu.is_drink) {
          details.push({
            commande_id: commande.id,
            plat_id: drinkId,
            quantite: 1,
            prix_unitaire: 0,
            customizations: {
              is_formula_drink: true,
              formula_name: formuleProbable.nom,
              formula_id: formuleProbable.id
            }
          });
          console.log(`   🥤 ${drinkMenu.nom} (0€)`);
        }
      }

      if (details.length === 0) {
        console.log(`   ❌ Aucun détail à créer`);
        erreurs++;
        continue;
      }

      // Insérer les détails
      const { data: insertedDetails, error: insertError } = await supabase
        .from('details_commande')
        .insert(details)
        .select();

      if (insertError) {
        console.error(`   ❌ Erreur insertion détails:`, insertError);
        erreurs++;
        continue;
      }

      console.log(`   ✅ ${insertedDetails.length} détails créés avec succès`);
      corrigees++;
    }

    console.log(`\n\n📊 RÉSUMÉ:`);
    console.log(`   ✅ Commandes corrigées: ${corrigees}`);
    console.log(`   ❌ Erreurs: ${erreurs}`);
    console.log(`   📦 Total traité: ${commandesACorriger.length}`);

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
corrigerToutesCommandesFormules()
  .then(() => {
    console.log('\n✅ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });


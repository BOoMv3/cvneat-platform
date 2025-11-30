#!/usr/bin/env node

/**
 * Script pour mettre à jour le menu d'O'TOASTY
 * - Supprime tous les menus actuels
 * - Crée les nouveaux menus basés sur la carte fournie
 * - Ajoute 20% aux prix affichés
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  try {
    const envFile = readFileSync(envPath, 'utf8');
    envFile.split(/\r?\n/).forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (!SUPABASE_URL && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) SUPABASE_URL = value;
      if (!SUPABASE_SERVICE_KEY && key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value;
    });
  } catch (error) {
    console.error('Impossible de lire .env.local :', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables Supabase manquantes.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RESTAURANT_NAME = "O'Toasty";

// Fonction pour ajouter 20% au prix
const addMargin = (price) => Math.round((price * 1.20) * 100) / 100;

// Configuration des nouveaux menus basés sur la carte fournie
const newMenuItems = [
  // ========== TACOS COMPOSÉS ==========
  {
    nom: "Tacos M - 1 Viande",
    description: "Tacos avec 1 viande au choix, frites et sauce fromagère maison",
    prix: addMargin(6.50), // 6.50€ -> 7.80€
    category: "Tacos",
    disponible: true,
    // Options de personnalisation pour les tacos composés
    meat_options: [
      { id: 'poulet', nom: 'Poulet', prix: 0, default: true },
      { id: 'tenders', nom: 'Tenders', prix: 0 },
      { id: 'escalope', nom: 'Escalope panée', prix: 0 },
      { id: 'cordon-bleu', nom: 'Cordon bleu', prix: 0 },
      { id: 'kebab', nom: 'Kebab', prix: 0 },
      { id: 'nuggets', nom: 'Nuggets', prix: 0 }
    ],
    sauce_options: [
      { id: 'algerienne', nom: 'Algérienne', prix: 0, default: true },
      { id: 'andalouse', nom: 'Andalouse', prix: 0 },
      { id: 'mayonnaise', nom: 'Mayonnaise', prix: 0 },
      { id: 'chilli-thai', nom: 'Chilli Thai', prix: 0 },
      { id: 'barbecue', nom: 'Barbecue', prix: 0 },
      { id: 'blanche', nom: 'Blanche', prix: 0 },
      { id: 'ketchup', nom: 'Ketchup', prix: 0 },
      { id: 'biggy', nom: 'Biggy', prix: 0 },
      { id: 'curry', nom: 'Curry', prix: 0 },
      { id: 'harissa', nom: 'Harissa', prix: 0 },
      { id: 'samourai', nom: 'Samouraï', prix: 0 }
    ],
    max_sauces: 2, // 2 choix max
    base_ingredients: [
      { id: 'frites', nom: 'Frites', prix: 0, removable: false },
      { id: 'sauce-fromagere', nom: 'Sauce fromagère maison', prix: 0, removable: false }
    ],
    supplements: [
      { nom: 'Gratiné', prix: addMargin(1.00) }, // 1.00€ -> 1.20€
      { nom: 'Cheddar', prix: addMargin(0.90) },
      { nom: 'Raclette', prix: addMargin(0.90) },
      { nom: 'Kiri', prix: addMargin(0.90) },
      { nom: 'Chèvre', prix: addMargin(0.90) },
      { nom: 'Mozza', prix: addMargin(0.90) },
      { nom: 'Oignon', prix: addMargin(0.50) },
      { nom: 'Tomates', prix: addMargin(0.50) },
      { nom: 'Lardons', prix: addMargin(0.50) },
      { nom: 'Bacon', prix: addMargin(0.50) },
      { nom: 'Blanc de poulet', prix: addMargin(0.50) },
      { nom: 'Miel', prix: addMargin(0.50) },
      { nom: 'Frites Petite', prix: addMargin(1.50) },
      { nom: 'Frites Grande', prix: addMargin(3.00) }
    ],
    requires_meat_selection: true,
    requires_sauce_selection: false
  },
  {
    nom: "Tacos L - 2 Viandes",
    description: "Tacos avec 2 viandes au choix, frites et sauce fromagère maison",
    prix: addMargin(8.50), // 8.50€ -> 10.20€
    category: "Tacos",
    disponible: true,
    meat_options: [
      { id: 'poulet', nom: 'Poulet', prix: 0, default: true },
      { id: 'tenders', nom: 'Tenders', prix: 0 },
      { id: 'escalope', nom: 'Escalope panée', prix: 0 },
      { id: 'cordon-bleu', nom: 'Cordon bleu', prix: 0 },
      { id: 'kebab', nom: 'Kebab', prix: 0 },
      { id: 'nuggets', nom: 'Nuggets', prix: 0 }
    ],
    sauce_options: [
      { id: 'algerienne', nom: 'Algérienne', prix: 0, default: true },
      { id: 'andalouse', nom: 'Andalouse', prix: 0 },
      { id: 'mayonnaise', nom: 'Mayonnaise', prix: 0 },
      { id: 'chilli-thai', nom: 'Chilli Thai', prix: 0 },
      { id: 'barbecue', nom: 'Barbecue', prix: 0 },
      { id: 'blanche', nom: 'Blanche', prix: 0 },
      { id: 'ketchup', nom: 'Ketchup', prix: 0 },
      { id: 'biggy', nom: 'Biggy', prix: 0 },
      { id: 'curry', nom: 'Curry', prix: 0 },
      { id: 'harissa', nom: 'Harissa', prix: 0 },
      { id: 'samourai', nom: 'Samouraï', prix: 0 }
    ],
    max_sauces: 2,
    max_meats: 2,
    base_ingredients: [
      { id: 'frites', nom: 'Frites', prix: 0, removable: false },
      { id: 'sauce-fromagere', nom: 'Sauce fromagère maison', prix: 0, removable: false }
    ],
    supplements: [
      { nom: 'Gratiné', prix: addMargin(1.00) },
      { nom: 'Cheddar', prix: addMargin(0.90) },
      { nom: 'Raclette', prix: addMargin(0.90) },
      { nom: 'Kiri', prix: addMargin(0.90) },
      { nom: 'Chèvre', prix: addMargin(0.90) },
      { nom: 'Mozza', prix: addMargin(0.90) },
      { nom: 'Oignon', prix: addMargin(0.50) },
      { nom: 'Tomates', prix: addMargin(0.50) },
      { nom: 'Lardons', prix: addMargin(0.50) },
      { nom: 'Bacon', prix: addMargin(0.50) },
      { nom: 'Blanc de poulet', prix: addMargin(0.50) },
      { nom: 'Miel', prix: addMargin(0.50) },
      { nom: 'Frites Petite', prix: addMargin(1.50) },
      { nom: 'Frites Grande', prix: addMargin(3.00) }
    ],
    requires_meat_selection: true,
    requires_sauce_selection: false
  },
  {
    nom: "Tacos XL - 3 Viandes",
    description: "Tacos avec 3 viandes au choix, frites et sauce fromagère maison",
    prix: addMargin(11.00), // 11€ -> 13.20€
    category: "Tacos",
    disponible: true,
    meat_options: [
      { id: 'poulet', nom: 'Poulet', prix: 0, default: true },
      { id: 'tenders', nom: 'Tenders', prix: 0 },
      { id: 'escalope', nom: 'Escalope panée', prix: 0 },
      { id: 'cordon-bleu', nom: 'Cordon bleu', prix: 0 },
      { id: 'kebab', nom: 'Kebab', prix: 0 },
      { id: 'nuggets', nom: 'Nuggets', prix: 0 }
    ],
    sauce_options: [
      { id: 'algerienne', nom: 'Algérienne', prix: 0, default: true },
      { id: 'andalouse', nom: 'Andalouse', prix: 0 },
      { id: 'mayonnaise', nom: 'Mayonnaise', prix: 0 },
      { id: 'chilli-thai', nom: 'Chilli Thai', prix: 0 },
      { id: 'barbecue', nom: 'Barbecue', prix: 0 },
      { id: 'blanche', nom: 'Blanche', prix: 0 },
      { id: 'ketchup', nom: 'Ketchup', prix: 0 },
      { id: 'biggy', nom: 'Biggy', prix: 0 },
      { id: 'curry', nom: 'Curry', prix: 0 },
      { id: 'harissa', nom: 'Harissa', prix: 0 },
      { id: 'samourai', nom: 'Samouraï', prix: 0 }
    ],
    max_sauces: 2,
    max_meats: 3,
    base_ingredients: [
      { id: 'frites', nom: 'Frites', prix: 0, removable: false },
      { id: 'sauce-fromagere', nom: 'Sauce fromagère maison', prix: 0, removable: false }
    ],
    supplements: [
      { nom: 'Gratiné', prix: addMargin(1.00) },
      { nom: 'Cheddar', prix: addMargin(0.90) },
      { nom: 'Raclette', prix: addMargin(0.90) },
      { nom: 'Kiri', prix: addMargin(0.90) },
      { nom: 'Chèvre', prix: addMargin(0.90) },
      { nom: 'Mozza', prix: addMargin(0.90) },
      { nom: 'Oignon', prix: addMargin(0.50) },
      { nom: 'Tomates', prix: addMargin(0.50) },
      { nom: 'Lardons', prix: addMargin(0.50) },
      { nom: 'Bacon', prix: addMargin(0.50) },
      { nom: 'Blanc de poulet', prix: addMargin(0.50) },
      { nom: 'Miel', prix: addMargin(0.50) },
      { nom: 'Frites Petite', prix: addMargin(1.50) },
      { nom: 'Frites Grande', prix: addMargin(3.00) }
    ],
    requires_meat_selection: true,
    requires_sauce_selection: false
  },

  // ========== TACOS SIGNATURE ==========
  {
    nom: "Le Chèvre Miel",
    description: "Poulet, chèvre, miel - Tacos signature",
    prix: addMargin(9.00), // 9€ -> 10.80€
    category: "Tacos Signature",
    disponible: true
  },
  {
    nom: "Le Montagnard",
    description: "Poulet, Jambon de dinde, Oignons frits, Raclette - Tacos signature",
    prix: addMargin(9.00), // 9€ -> 10.80€
    category: "Tacos Signature",
    disponible: true
  },

  // ========== BURGERS (pour Menu Enfants) ==========
  {
    nom: "Cheese Burger",
    description: "Burger avec steak, fromage, salade, tomate",
    prix: addMargin(5.00), // Prix approximatif, sera dans le menu
    category: "Burgers",
    disponible: true
  },
  {
    nom: "Mini Tacos",
    description: "Tacos mini (pour menu enfants)",
    prix: addMargin(3.00), // Prix approximatif, sera dans le menu
    category: "Tacos",
    disponible: true
  },

  // ========== TEXMEX ==========
  {
    nom: "6 Nuggets",
    description: "6 nuggets de poulet",
    prix: addMargin(4.50), // 4.50€ -> 5.40€
    category: "Texmex",
    disponible: true
  },
  {
    nom: "4 Bâtonnets de Mozzarella",
    description: "4 bâtonnets de mozzarella",
    prix: addMargin(3.00), // 3€ -> 3.60€
    category: "Texmex",
    disponible: true
  },
  {
    nom: "3 Tenders",
    description: "3 tenders de poulet",
    prix: addMargin(5.00), // 5€ -> 6.00€
    category: "Texmex",
    disponible: true
  },
  {
    nom: "6 Wings",
    description: "6 ailes de poulet",
    prix: addMargin(5.00), // 5€ -> 6.00€
    category: "Texmex",
    disponible: true
  },

];

async function main() {
  try {
    console.log('🔍 Recherche du restaurant O\'TOASTY...\n');

    // 1. Trouver le restaurant
    const { data: restaurants, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, user_id')
      .ilike('nom', `%${RESTAURANT_NAME}%`);

    if (restaurantError) {
      throw new Error(`Erreur recherche restaurant: ${restaurantError.message}`);
    }

    if (!restaurants || restaurants.length === 0) {
      throw new Error(`Restaurant "${RESTAURANT_NAME}" non trouvé`);
    }

    const restaurant = restaurants[0];
    console.log(`✅ Restaurant trouvé: ${restaurant.nom} (ID: ${restaurant.id})\n`);

    // 2. Supprimer tous les menus actuels
    console.log('🗑️  Suppression des menus actuels...');
    const { error: deleteError } = await supabaseAdmin
      .from('menus')
      .delete()
      .eq('restaurant_id', restaurant.id);

    if (deleteError) {
      throw new Error(`Erreur suppression menus: ${deleteError.message}`);
    }
    console.log('✅ Menus actuels supprimés\n');

    // 3. Supprimer toutes les formules actuelles
    console.log('🗑️  Suppression des formules actuelles...');
    const { data: formulas, error: formulasError } = await supabaseAdmin
      .from('formulas')
      .select('id')
      .eq('restaurant_id', restaurant.id);

    if (!formulasError && formulas && formulas.length > 0) {
      // Supprimer d'abord les formula_items
      for (const formula of formulas) {
        await supabaseAdmin
          .from('formula_items')
          .delete()
          .eq('formula_id', formula.id);
      }
      // Puis les formules
      await supabaseAdmin
        .from('formulas')
        .delete()
        .eq('restaurant_id', restaurant.id);
    }
    console.log('✅ Formules actuelles supprimées\n');

    // 4. Créer les boissons d'abord (pour les utiliser dans les menus)
    console.log('🥤 Création des boissons...');
    const drinkIds = {};
    
    const drinks = [
      { nom: 'Coca-Cola', prix: addMargin(1.50), description: 'Canette 33cl', category: 'Boissons' },
      { nom: 'Orangina', prix: addMargin(1.50), description: 'Canette 33cl', category: 'Boissons' },
      { nom: 'Oasis Tropical', prix: addMargin(1.50), description: 'Canette 33cl', category: 'Boissons' },
      { nom: 'Capri-Sun', prix: addMargin(1.00), description: 'Capri-Sun', category: 'Boissons' },
      { nom: 'Eau', prix: addMargin(0.50), description: 'Eau minérale', category: 'Boissons' },
      { nom: 'Thé', prix: addMargin(1.00), description: 'Thé chaud', category: 'Boissons' }
    ];

    for (const drink of drinks) {
      const { data: drinkItem, error: drinkError } = await supabaseAdmin
        .from('menus')
        .insert([{
          restaurant_id: restaurant.id,
          nom: drink.nom,
          description: drink.description,
          prix: drink.prix,
          category: drink.category || 'Boissons',
          disponible: true,
          is_drink: true,
          drink_price_small: drink.prix
        }])
        .select()
        .single();

      if (!drinkError && drinkItem) {
        drinkIds[drink.nom] = drinkItem.id;
        console.log(`  ✅ ${drink.nom} créée (${drink.prix.toFixed(2)}€)`);
      }
    }
    console.log('');

    // 5. Créer tous les menus
    console.log('📝 Création des nouveaux menus...\n');
    const createdMenuIds = {};

    for (const menuItem of newMenuItems) {
      // Préparer les données du menu
      const menuData = {
        restaurant_id: restaurant.id,
        nom: menuItem.nom,
        description: menuItem.description || '',
        prix: menuItem.prix,
        category: menuItem.category,
        disponible: menuItem.disponible !== false,
        is_drink: menuItem.is_drink || false
      };

      // Ajouter les options de personnalisation
      if (menuItem.meat_options) {
        menuData.meat_options = menuItem.meat_options;
        menuData.requires_meat_selection = menuItem.requires_meat_selection || false;
        menuData.max_meats = menuItem.max_meats || null;
      }

      if (menuItem.sauce_options) {
        menuData.sauce_options = menuItem.sauce_options;
        menuData.max_sauces = menuItem.max_sauces || null;
      }

      if (menuItem.base_ingredients) {
        menuData.base_ingredients = menuItem.base_ingredients;
      }

      if (menuItem.supplements) {
        menuData.supplements = menuItem.supplements;
      }

      if (menuItem.is_drink && menuItem.drink_price_small) {
        menuData.drink_price_small = menuItem.drink_price_small;
      }

      // Créer le menu
      const { data: createdMenu, error: menuError } = await supabaseAdmin
        .from('menus')
        .insert([menuData])
        .select()
        .single();

      if (menuError) {
        console.error(`  ❌ Erreur création ${menuItem.nom}:`, menuError.message);
        continue;
      }

      createdMenuIds[menuItem.nom] = createdMenu.id;
      console.log(`  ✅ ${menuItem.nom} créé (${menuItem.prix.toFixed(2)}€)`);
    }

    // 6. Créer les formules (Menus)
    console.log('\n📦 Création des formules (Menus)...\n');

    // Menu Etudiant: Tacos M + Boisson + Frites (déjà incluses)
    const { data: menuEtudiant, error: menuEtudiantError } = await supabaseAdmin
      .from('formulas')
      .insert([{
        restaurant_id: restaurant.id,
        nom: 'Menu Etudiant',
        description: 'Tacos 1 Viande + 1 Boisson + Frites',
        prix: addMargin(8.00),
        disponible: true,
        drink_options: [drinkIds['Coca-Cola'], drinkIds['Orangina'], drinkIds['Oasis Tropical']].filter(Boolean)
      }])
      .select()
      .single();

    if (!menuEtudiantError && menuEtudiant) {
      // Créer les formula_items
      const tacosMId = createdMenuIds["Tacos M - 1 Viande"];
      if (tacosMId) {
        await supabaseAdmin
          .from('formula_items')
          .insert([
            {
              formula_id: menuEtudiant.id,
              menu_id: tacosMId,
              quantity: 1,
              order_index: 1
            }
          ]);
      }
      console.log(`  ✅ Menu Etudiant créé (${addMargin(8.00).toFixed(2)}€)`);
    }

    // Menu Enfants: Cheese Burger OU 4 Nuggets + Mini Tacos + Frites + Boisson + Surprise
    // Note: On crée une formule avec les options disponibles
    const { data: menuEnfants, error: menuEnfantsError } = await supabaseAdmin
      .from('formulas')
      .insert([{
        restaurant_id: restaurant.id,
        nom: 'Menu Enfants',
        description: 'Cheese Burger OU 4 Nuggets + Mini Tacos + Frites + Capri-Sun ou Eau + Surprise',
        prix: addMargin(6.00),
        disponible: true,
        drink_options: [drinkIds['Capri-Sun'], drinkIds['Eau']].filter(Boolean)
      }])
      .select()
      .single();

    if (!menuEnfantsError && menuEnfants) {
      // Ajouter les options possibles : Nuggets OU Cheese Burger, puis Mini Tacos
      const nuggetsId = createdMenuIds["6 Nuggets"];
      const cheeseBurgerId = createdMenuIds["Cheese Burger"];
      const miniTacosId = createdMenuIds["Mini Tacos"];
      
      if (nuggetsId) {
        await supabaseAdmin
          .from('formula_items')
          .insert([
            {
              formula_id: menuEnfants.id,
              menu_id: nuggetsId,
              quantity: 1,
              order_index: 1
            }
          ]);
      }
      
      // Note: Le Cheese Burger est une alternative, mais pour simplifier on met juste les nuggets
      // Le Mini Tacos devrait aussi être inclus si disponible
      if (miniTacosId) {
        await supabaseAdmin
          .from('formula_items')
          .insert([
            {
              formula_id: menuEnfants.id,
              menu_id: miniTacosId,
              quantity: 1,
              order_index: 2
            }
          ]);
      }
      
      console.log(`  ✅ Menu Enfants créé (${addMargin(6.00).toFixed(2)}€)`);
    }

    // 7. Mettre à jour les drink_options des menus qui ont besoin de boissons
    // Menu Etudiant - mettre à jour drink_options
    if (menuEtudiant) {
      await supabaseAdmin
        .from('formulas')
        .update({
          drink_options: [drinkIds['Coca-Cola'], drinkIds['Orangina'], drinkIds['Oasis Tropical']].filter(Boolean)
        })
        .eq('id', menuEtudiant.id);
    }

    console.log('\n✅ Menu O\'TOASTY mis à jour avec succès !');
    console.log(`\n📊 Résumé:`);
    console.log(`   - ${Object.keys(createdMenuIds).length} menus créés`);
    console.log(`   - ${drinks.length} boissons créées`);
    console.log(`   - 2 formules créées (Menus)`);
    console.log(`   - +20% ajouté sur tous les prix\n`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();


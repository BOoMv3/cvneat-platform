#!/usr/bin/env node

/**
 * Script pour ajouter le système "Compose ton Poke Bowl" avec options de personnalisation
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

const RESTAURANT_NAME = 'Molokai';

// Fonction pour ajouter 25% au prix
const addMargin = (price) => Math.round((price * 1.25) * 100) / 100;

async function main() {
  try {
    console.log('🔍 Recherche du restaurant Molokai...\n');

    // 1. Trouver le restaurant
    const { data: restaurants, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .ilike('nom', `%${RESTAURANT_NAME}%`);

    if (restaurantError) {
      throw new Error(`Erreur recherche restaurant: ${restaurantError.message}`);
    }

    if (!restaurants || restaurants.length === 0) {
      throw new Error(`Restaurant "${RESTAURANT_NAME}" non trouvé`);
    }

    const restaurant = restaurants[0];
    console.log(`✅ Restaurant trouvé: ${restaurant.nom} (ID: ${restaurant.id})\n`);

    // 2. Créer le menu "Compose ton Poke Bowl"
    console.log('📝 Création du menu "Compose ton Poke Bowl"...\n');

    const composePokeBowl = {
      restaurant_id: restaurant.id,
      nom: "Compose ton Poke Bowl",
      description: "Créez votre poke bowl personnalisé : base, protéine, 5 toppings, sauce et crunch",
      prix: addMargin(9.90), // Prix de base, sera ajusté selon les choix
      category: "Compose ton Poke Bowl",
      disponible: true,
      // Options de base (étape 1)
      base_ingredients: [
        { id: 'riz-vinaigre', nom: 'Riz Vinaigré', prix: 0, removable: false },
        { id: 'riz-parfume', nom: 'Riz Parfumé', prix: 0, removable: false }
      ],
      // Options de protéine (étape 2)
      meat_options: [
        { id: 'saumon', nom: 'Saumon', prix: 0, default: true },
        { id: 'poulet-croustillant', nom: 'Poulet Croustillant', prix: 0 },
        { id: 'falafel', nom: 'Falafel', prix: 0 },
        { id: 'thon', nom: 'Thon', prix: 0 },
        { id: 'tofu', nom: 'Tofu', prix: 0 },
        { id: 'crevette', nom: 'Crevette', prix: 0 }
      ],
      supplements: [
        { nom: 'Extra Protéine', prix: addMargin(2.50) } // 2.50€ -> 3.13€
      ],
      // Options de toppings (étape 3) - 5 choix max
      // Les toppings sont inclus dans le prix de base, donc on les met dans base_ingredients comme removable
      // Mais on va créer un système avec des suppléments pour les toppings premium
      // Note: Les toppings standards sont inclus, les premium sont en supplément
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      requires_meat_selection: true,
      requires_sauce_selection: false
    };

    // Ajouter les toppings comme suppléments (ceux qui sont en supplément)
    const premiumToppings = [
      { nom: 'Avocat', prix: addMargin(1.00) },
      { nom: 'Wakamé', prix: addMargin(1.00) },
      { nom: 'Mangue', prix: addMargin(1.00) }
    ];

    // Les toppings standards sont inclus (concombre, carotte, choux, etc.)
    // On les met dans base_ingredients pour qu'ils puissent être retirés
    const standardToppings = [
      { id: 'concombre', nom: 'Concombre', prix: 0, removable: true },
      { id: 'choux-marine', nom: 'Choux Mariné', prix: 0, removable: true },
      { id: 'carotte', nom: 'Carotte', prix: 0, removable: true },
      { id: 'betterave', nom: 'Betterave', prix: 0, removable: true },
      { id: 'oignon-rouge', nom: 'Oignon Rouge', prix: 0, removable: true },
      { id: 'edamame', nom: 'Edamame', prix: 0, removable: true },
      { id: 'radis', nom: 'Radis', prix: 0, removable: true },
      { id: 'tomate-cerise', nom: 'Tomate Cerise', prix: 0, removable: true },
      { id: 'ananas', nom: 'Ananas', prix: 0, removable: true },
      { id: 'gingembre-marine', nom: 'Gingembre Mariné', prix: 0, removable: true }
    ];

    composePokeBowl.base_ingredients = [
      ...composePokeBowl.base_ingredients,
      ...standardToppings
    ];

    composePokeBowl.supplements = [
      ...composePokeBowl.supplements,
      ...premiumToppings
    ];

    // Options de sauce (étape 5)
    composePokeBowl.sauce_options = [
      { id: 'soja-sucree', nom: 'Soja Sucrée', prix: 0, default: true },
      { id: 'soja-salee', nom: 'Soja Salée', prix: 0 },
      { id: 'spicy-mayo', nom: 'Spicy Mayo', prix: 0 },
      { id: 'tropical', nom: 'Tropical', prix: 0 },
      { id: 'sesame', nom: 'Sésame', prix: 0 },
      { id: 'huile-olive', nom: 'Huile d\'Olive', prix: 0 },
      { id: 'hot-chili', nom: 'Hot Chili', prix: 0 }
    ];

    // Options de crunch (étape 4) - 1 choix
    // On les met dans supplements car ils sont inclus dans le prix de base
    const crunchOptions = [
      { nom: 'Oignons Frits', prix: 0 },
      { nom: 'Ciboulette', prix: 0 },
      { nom: 'Coriandre', prix: 0 },
      { nom: 'Raisin Sec', prix: 0 },
      { nom: 'Grenade', prix: 0 },
      { nom: 'Cacahuètes', prix: 0 },
      { nom: 'Cébette', prix: 0 },
      { nom: 'Amandes', prix: 0 },
      { nom: 'Graines de Courge', prix: 0 },
      { nom: 'Graines de Sésame', prix: 0 }
    ];

    // Note: Les crunch sont inclus, donc prix 0
    // On pourrait les mettre dans un champ séparé, mais pour simplifier on les met dans supplements avec prix 0

    const { data: createdPoke, error: pokeError } = await supabaseAdmin
      .from('menus')
      .insert([composePokeBowl])
      .select()
      .single();

    if (pokeError) {
      throw new Error(`Erreur création Compose ton Poke Bowl: ${pokeError.message}`);
    }

    console.log(`  ✅ Compose ton Poke Bowl créé (${composePokeBowl.prix.toFixed(2)}€)`);

    // 3. Créer les sauces et suppléments comme menus séparés (pour faciliter la gestion)
    console.log('\n📝 Création des sauces et suppléments...\n');

    const saucesEtSupplements = [
      // Sauces
      { nom: "Soja Sucrée", description: "Sauce", prix: addMargin(0.50), category: "Sauces et Suppléments" },
      { nom: "Soja Salée", description: "Sauce", prix: addMargin(0.50), category: "Sauces et Suppléments" },
      { nom: "Sauce Takitori", description: "Sauce", prix: addMargin(0.50), category: "Sauces et Suppléments" },
      { nom: "Mayo Spicy", description: "Sauce", prix: addMargin(0.50), category: "Sauces et Suppléments" },
      { nom: "Sweet Chili", description: "Sauce", prix: addMargin(0.50), category: "Sauces et Suppléments" },
      { nom: "Sriracha", description: "Sauce", prix: addMargin(0.50), category: "Sauces et Suppléments" },
      // Suppléments
      { nom: "Supplement Gingembre", description: "Supplément", prix: addMargin(0.50), category: "Sauces et Suppléments" },
      { nom: "Supplement Wasabi", description: "Supplément", prix: addMargin(0.50), category: "Sauces et Suppléments" },
      { nom: "Supplement Oignon Frits", description: "Supplément", prix: addMargin(0.50), category: "Sauces et Suppléments" },
      { nom: "Supplement Cheese", description: "Supplément", prix: addMargin(0.50), category: "Sauces et Suppléments" }
    ];

    for (const item of saucesEtSupplements) {
      const { error: itemError } = await supabaseAdmin
        .from('menus')
        .insert([{
          restaurant_id: restaurant.id,
          nom: item.nom,
          description: item.description,
          prix: item.prix,
          category: item.category,
          disponible: true
        }]);

      if (itemError) {
        console.error(`  ❌ Erreur création ${item.nom}:`, itemError.message);
      } else {
        console.log(`  ✅ ${item.nom} créé (${item.prix.toFixed(2)}€)`);
      }
    }

    console.log('\n✅ Compose ton Poke Bowl et suppléments ajoutés avec succès !');
    console.log(`\n📊 Résumé:`);
    console.log(`   - 1 menu "Compose ton Poke Bowl" créé`);
    console.log(`   - ${saucesEtSupplements.length} sauces et suppléments créés`);
    console.log(`   - +25% ajouté sur tous les prix\n`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();


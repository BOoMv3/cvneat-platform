#!/usr/bin/env node

/**
 * Script pour ajouter les Plateaux, Pokes Signatures et Formules de Molokai avec +25%
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

// Plateaux (formules)
const plateaux = [
  {
    nom: "Salmon Lovers",
    description: "6 maki saumon cheese, 6 california saumon avocat, 6 spring roll saumon avocat - 18 pièces",
    prix: addMargin(20.50), // 20.50€ -> 25.63€
    category: "Les Plateaux",
    disponible: true,
    is_formula: true,
    items: [
      { nom: "Maki Saumon Cheese", quantity: 6 },
      { nom: "California Saumon Avocat", quantity: 6 },
      { nom: "Spring Roll Saumon Avocat", quantity: 6 }
    ],
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Full Sushi",
    description: "10 sushi saumon - 10 pièces",
    prix: addMargin(18.50), // 18.50€ -> 23.13€
    category: "Les Plateaux",
    disponible: true,
    is_formula: true,
    items: [
      { nom: "Sushi Saumon", quantity: 10 }
    ],
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Super Salmon",
    description: "6 california saumon avocat, 6 spring roll thon cuit avocat, 6 maki saumon, 4 sushi saumon, 2 sushi saumon cheese - 24 pièces",
    prix: addMargin(27.50), // 27.50€ -> 34.38€
    category: "Les Plateaux",
    disponible: true,
    is_formula: true,
    items: [
      { nom: "California Saumon Avocat", quantity: 6 },
      { nom: "Spring Roll Thon Cuit Mayo Avocat", quantity: 6 },
      { nom: "Maki Saumon", quantity: 6 },
      { nom: "Sushi Saumon", quantity: 4 },
      { nom: "Sushi Saumon Cheese", quantity: 2 }
    ],
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Mix Gourmet",
    description: "6 california thon cuit, 6 california poulet crispy mayo, 6 california avocat cheese concombre - 18 pièces",
    prix: addMargin(18.50), // 18.50€ -> 23.13€
    category: "Les Plateaux",
    disponible: true,
    is_formula: true,
    items: [
      { nom: "California Thon Cuit Mayo Avocat", quantity: 6 },
      { nom: "California Poulet Crispy Mayo Spicy", quantity: 6 },
      { nom: "California Avocat Cheese Concombre", quantity: 6 }
    ],
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Super Gourmet",
    description: "6 california saumon concombre, 6 california crevette tempura avocat, 6 spring roll thon cuit avocat, 6 spring roll avocat concombre carotte - 24 pièces",
    prix: addMargin(23.50), // 23.50€ -> 29.38€
    category: "Les Plateaux",
    disponible: true,
    is_formula: true,
    items: [
      { nom: "California Saumon Concombre", quantity: 6 },
      { nom: "California Crevette Tempura Avocat", quantity: 6 },
      { nom: "Spring Roll Thon Cuit Mayo Avocat", quantity: 6 },
      { nom: "Spring Roll Avocat Concombre Carotte", quantity: 6 }
    ],
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  }
];

// Pokes Signatures
const pokesSignatures = [
  {
    nom: "Original Saumon",
    description: "Saumon, ananas, concombre, carotte, choux blanc mariné, ciboulette, graine de sésame",
    prix: addMargin(9.90), // 9.90€ -> 12.38€
    category: "Les Pokes Signatures",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Falafel",
    description: "Falafel, ananas, radis, concombre, betterave, édamame, ciboulette, graine de sésame",
    prix: addMargin(9.90), // 9.90€ -> 12.38€
    category: "Les Pokes Signatures",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Hawaiian",
    description: "Saumon, édamame, mangue, ananas, carotte, graine de sésame",
    prix: addMargin(10.90), // 10.90€ -> 13.63€
    category: "Les Pokes Signatures",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Thon Mariné",
    description: "Thon, édamame, concombre, choux blanc, carotte, coriandre, ciboulette, graine de sésame",
    prix: addMargin(11.90), // 11.90€ -> 14.88€
    category: "Les Pokes Signatures",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Poulet Croustillant",
    description: "Poulet croustillant, tomate cerise, oignons rouge, choux blanc mariné, concombre, oignons frits, sauce teriyaki, graine de sésame",
    prix: addMargin(11.90), // 11.90€ -> 14.88€
    category: "Les Pokes Signatures",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Original Tuna",
    description: "Thon, ananas, concombre, carotte, choux blanc mariné, ciboulette, graine de sésame",
    prix: addMargin(9.90), // 9.90€ -> 12.38€
    category: "Les Pokes Signatures",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Tofu Mariné",
    description: "Tofu, ananas, radis, concombre, betterave, édamame, ciboulette, graine de sésame",
    prix: addMargin(9.90), // 9.90€ -> 12.38€
    category: "Les Pokes Signatures",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Saumon Mariné",
    description: "Saumon, édamame, concombre, choux blanc, carotte, coriandre, ciboulette, graine de sésame",
    prix: addMargin(11.90), // 11.90€ -> 14.88€
    category: "Les Pokes Signatures",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Crevette Mariné",
    description: "Crevette, édamame, concombre, choux blanc, carotte, coriandre, ciboulette, graine de sésame",
    prix: addMargin(11.90), // 11.90€ -> 14.88€
    category: "Les Pokes Signatures",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Golden",
    description: "Saumon tataki, avocat, wakamé, tomate cerise, betterave, lamelle de gingembre mariné, sauce spicy mayo, graine de sésame",
    prix: addMargin(13.90), // 13.90€ -> 17.38€
    category: "Les Pokes Signatures",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  }
];

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

    // 2. Récupérer tous les menus existants pour les IDs
    const { data: existingMenus, error: menusError } = await supabaseAdmin
      .from('menus')
      .select('id, nom')
      .eq('restaurant_id', restaurant.id);

    if (menusError) {
      throw new Error(`Erreur récupération menus: ${menusError.message}`);
    }

    const menuIdsMap = {};
    (existingMenus || []).forEach(menu => {
      menuIdsMap[menu.nom] = menu.id;
    });

    // 3. Créer les Pokes Signatures
    console.log('📝 Création des Pokes Signatures...\n');
    for (const poke of pokesSignatures) {
      const { data: createdPoke, error: pokeError } = await supabaseAdmin
        .from('menus')
        .insert([{
          restaurant_id: restaurant.id,
          nom: poke.nom,
          description: poke.description,
          prix: poke.prix,
          category: poke.category,
          disponible: poke.disponible,
          image_url: poke.image_url
        }])
        .select()
        .single();

      if (pokeError) {
        console.error(`  ❌ Erreur création ${poke.nom}:`, pokeError.message);
      } else {
        menuIdsMap[poke.nom] = createdPoke.id;
        console.log(`  ✅ ${poke.nom} créé (${poke.prix.toFixed(2)}€)`);
      }
    }

    // 4. Créer les Plateaux (formules)
    console.log('\n📦 Création des Plateaux (formules)...\n');
    
    for (const plateau of plateaux) {
      // Créer la formule
      const { data: formula, error: formulaError } = await supabaseAdmin
        .from('formulas')
        .insert([{
          restaurant_id: restaurant.id,
          nom: plateau.nom,
          description: plateau.description,
          prix: plateau.prix,
          disponible: plateau.disponible
        }])
        .select()
        .single();

      if (formulaError) {
        console.error(`  ❌ Erreur création formule ${plateau.nom}:`, formulaError.message);
        continue;
      }

      // Ajouter les items de la formule
      let orderIndex = 1;
      for (const item of plateau.items) {
        const menuId = menuIdsMap[item.nom];
        if (menuId) {
          await supabaseAdmin
            .from('formula_items')
            .insert([{
              formula_id: formula.id,
              menu_id: menuId,
              quantity: item.quantity || 1,
              order_index: orderIndex
            }]);
          orderIndex++;
        } else {
          console.warn(`  ⚠️  Menu "${item.nom}" non trouvé pour le plateau ${plateau.nom}`);
        }
      }

      console.log(`  ✅ ${plateau.nom} créé (${plateau.prix.toFixed(2)}€)`);
    }

    // 5. Récupérer les boissons pour les formules
    const { data: drinks, error: drinksError } = await supabaseAdmin
      .from('menus')
      .select('id, nom')
      .eq('restaurant_id', restaurant.id)
      .eq('category', 'Boissons')
      .or('category.eq.La Sélection');

    const drinkIds = {};
    (drinks || []).forEach(drink => {
      drinkIds[drink.nom] = drink.id;
    });

    // 6. Créer les formules (Poké bowl+Boisson, Poké bowl+Boisson+Dessert)
    console.log('\n📦 Création des formules...\n');

    // Formula Poké bowl + Boisson
    const { data: formulePokeBoisson, error: formuleError1 } = await supabaseAdmin
      .from('formulas')
      .insert([{
        restaurant_id: restaurant.id,
        nom: 'Formule Poké Bowl + Boisson',
        description: 'Poké bowl + Boisson',
        prix: addMargin(11.90), // 11.90€ -> 14.88€
        disponible: true,
        drink_options: Object.values(drinkIds).filter(Boolean)
      }])
      .select()
      .single();

    if (!formuleError1 && formulePokeBoisson) {
      console.log(`  ✅ Formule Poké Bowl + Boisson créée (${addMargin(11.90).toFixed(2)}€)`);
    }

    // Formula Poké bowl + Boisson + Dessert
    const { data: formulePokeBoissonDessert, error: formuleError2 } = await supabaseAdmin
      .from('formulas')
      .insert([{
        restaurant_id: restaurant.id,
        nom: 'Formule Poké Bowl + Boisson + Dessert',
        description: 'Poké bowl + Boisson + Dessert',
        prix: addMargin(15.90), // 15.90€ -> 19.88€
        disponible: true,
        drink_options: Object.values(drinkIds).filter(Boolean)
      }])
      .select()
      .single();

    if (!formuleError2 && formulePokeBoissonDessert) {
      console.log(`  ✅ Formule Poké Bowl + Boisson + Dessert créée (${addMargin(15.90).toFixed(2)}€)`);
    }

    console.log('\n✅ Plateaux, Pokes Signatures et Formules ajoutés avec succès !');
    console.log(`\n📊 Résumé:`);
    console.log(`   - ${pokesSignatures.length} Pokes Signatures créés`);
    console.log(`   - ${plateaux.length} Plateaux créés`);
    console.log(`   - 2 Formules créées`);
    console.log(`   - +25% ajouté sur tous les prix\n`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();


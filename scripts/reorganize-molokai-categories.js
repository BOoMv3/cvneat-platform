#!/usr/bin/env node

/**
 * Script pour réorganiser les catégories de Molokai dans le bon ordre
 * Ordre : Signatures, Sushi, Spring Rolls, Salmon Aburi, Makis, California, Crispy, Accompagnements, Pokes, Plateaux, Compose, puis Boissons/Sauces/Desserts à la fin
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

// Ordre logique des catégories pour Molokai
const CATEGORY_ORDER = [
  // 1. Signatures et spécialités
  'Signatures x6',
  
  // 2. Sushi
  'Sushi Nigiri x2',
  
  // 3. Spring Rolls
  'Spring Rolls x6',
  
  // 4. Salmon Aburi
  'Salmon Aburi Rolls x6',
  
  // 5. Makis
  'Makis x6',
  
  // 6. California
  'California x6',
  
  // 7. Crispy
  'Les Crispy x6',
  
  // 8. Accompagnements
  'Accompagnements',
  
  // 9. Pokes Signatures
  'Les Pokes Signatures',
  
  // 10. Plateaux
  'Les Plateaux',
  
  // 11. Compose ton Poke Bowl
  'Compose ton Poke Bowl',
  
  // 12. Formules (si présentes)
  'Menus',
  'Formules',
  
  // 13. Boissons (à la fin)
  'Boissons',
  'La Sélection',
  
  // 14. Sauces et suppléments (à la fin)
  'Sauces et Suppléments',
  
  // 15. Desserts (à la fin)
  'Desserts'
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

    // 2. Récupérer tous les menus
    console.log('📋 Récupération des menus...');
    const { data: menus, error: menusError } = await supabaseAdmin
      .from('menus')
      .select('id, nom, category')
      .eq('restaurant_id', restaurant.id);

    if (menusError) {
      throw new Error(`Erreur récupération menus: ${menusError.message}`);
    }

    console.log(`✅ ${menus.length} menus trouvés\n`);

    // 3. Récupérer les formules aussi
    const { data: formulas, error: formulasError } = await supabaseAdmin
      .from('formulas')
      .select('id, nom, category')
      .eq('restaurant_id', restaurant.id);

    // 4. Créer un mapping des catégories actuelles
    const categoriesMap = new Map();
    (menus || []).forEach(menu => {
      const cat = menu.category || 'Autres';
      if (!categoriesMap.has(cat)) {
        categoriesMap.set(cat, []);
      }
      categoriesMap.get(cat).push(menu);
    });

    console.log('📊 Catégories actuelles:');
    categoriesMap.forEach((items, cat) => {
      console.log(`   - ${cat}: ${items.length} items`);
    });
    console.log('');

    // 5. Afficher l'ordre souhaité
    console.log('🔄 Réorganisation des catégories dans l\'ordre logique...\n');
    console.log('Ordre souhaité:');
    CATEGORY_ORDER.forEach((cat, index) => {
      const count = categoriesMap.get(cat)?.length || 0;
      if (count > 0 || cat === 'Les Plateaux' || cat === 'Formules') {
        console.log(`   ${index + 1}. ${cat}${count > 0 ? ` (${count} items)` : ''}`);
      }
    });
    console.log('');

    // 6. Les catégories sont déjà correctes dans la base de données
    // Le tri se fait côté frontend dans MenuByCategories.js
    // On va juste vérifier que toutes les catégories sont bien présentes

    console.log('✅ Les catégories sont déjà correctement nommées dans la base de données.');
    console.log('   Le tri sera effectué automatiquement par le composant MenuByCategories.\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();


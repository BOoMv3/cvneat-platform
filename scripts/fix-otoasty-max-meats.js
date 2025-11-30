#!/usr/bin/env node

/**
 * Script pour corriger les limites de viandes pour les tacos O'Toasty
 * - Tacos M - 1 Viande : max_meats = 1
 * - Tacos L - 2 Viandes : max_meats = 2
 * - Tacos XL - 3 Viandes : max_meats = 3
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

// Mapping des tacos avec leurs limites de viandes
const TACOS_MAX_MEATS = {
  'Tacos M - 1 Viande': 1,
  'Tacos L - 2 Viandes': 2,
  'Tacos XL - 3 Viandes': 3
};

async function main() {
  try {
    console.log('🔍 Recherche du restaurant O\'Toasty...\n');

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

    // 2. Récupérer tous les menus de tacos
    console.log('📋 Récupération des menus de tacos...');
    const { data: menus, error: menusError } = await supabaseAdmin
      .from('menus')
      .select('id, nom, max_meats')
      .eq('restaurant_id', restaurant.id)
      .in('nom', Object.keys(TACOS_MAX_MEATS));

    if (menusError) {
      throw new Error(`Erreur récupération menus: ${menusError.message}`);
    }

    if (!menus || menus.length === 0) {
      console.log('⚠️  Aucun menu de tacos trouvé. Vérifiez que les menus existent.');
      return;
    }

    console.log(`✅ ${menus.length} menus de tacos trouvés\n`);

    // 3. Mettre à jour chaque tacos avec la bonne limite
    let updatedCount = 0;
    for (const menu of menus) {
      const expectedMaxMeats = TACOS_MAX_MEATS[menu.nom];
      
      if (expectedMaxMeats === undefined) {
        console.log(`⚠️  Menu "${menu.nom}" non trouvé dans la configuration, ignoré.`);
        continue;
      }

      // Vérifier si la limite est déjà correcte
      if (menu.max_meats === expectedMaxMeats) {
        console.log(`✓  "${menu.nom}" : déjà à ${expectedMaxMeats} viande${expectedMaxMeats > 1 ? 's' : ''}`);
        continue;
      }

      // Mettre à jour
      console.log(`🔄 Mise à jour "${menu.nom}" : max_meats = ${expectedMaxMeats}...`);
      const { error: updateError } = await supabaseAdmin
        .from('menus')
        .update({ max_meats: expectedMaxMeats })
        .eq('id', menu.id);

      if (updateError) {
        console.error(`❌ Erreur mise à jour "${menu.nom}":`, updateError.message);
        continue;
      }

      console.log(`✅ "${menu.nom}" mis à jour : max_meats = ${expectedMaxMeats}`);
      updatedCount++;
    }

    console.log(`\n🎉 Mise à jour terminée ! ${updatedCount} menu${updatedCount > 1 ? 'x' : ''} mis à jour.\n`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();


#!/usr/bin/env node

/**
 * Script pour corriger directement les options des tacos O Toasty
 * Utilise l'API Supabase pour mettre à jour les menus
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Charger les variables d'environnement
// Essayer plusieurs chemins possibles
const possiblePaths = [
  join(process.cwd(), '.env.local'),
  join(__dirname, '..', '.env.local'),
  join(__dirname, '../..', '.env.local'),
  '/Users/boomv3/Desktop/cvneat-platform/.env.local'
];

let envPath = null;
for (const path of possiblePaths) {
  if (existsSync(path)) {
    envPath = path;
    break;
  }
}

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (envPath) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((lineRaw) => {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (!key || valueParts.length === 0) return;
    const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !SUPABASE_URL) SUPABASE_URL = value;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = value;
  });
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Options de viande
const meatOptions = [
  { id: 'poulet', nom: 'Poulet', prix: 0, default: true },
  { id: 'tenders', nom: 'Tenders', prix: 0, default: false },
  { id: 'escalope', nom: 'Escalope panée', prix: 0, default: false },
  { id: 'cordon-bleu', nom: 'Cordon bleu', prix: 0, default: false },
  { id: 'viande-hachee', nom: 'Viande hachée', prix: 0, default: false },
  { id: 'kebab', nom: 'Kebab', prix: 0, default: false },
  { id: 'nuggets', nom: 'Nuggets', prix: 0, default: false }
];

// Options de sauce
const sauceOptions = [
  { id: 'algerienne', nom: 'Algérienne', prix: 0, default: true },
  { id: 'andalouse', nom: 'Andalouse', prix: 0, default: false },
  { id: 'mayonnaise', nom: 'Mayonnaise', prix: 0, default: false },
  { id: 'chilli-thai', nom: 'Chilli Thai', prix: 0, default: false },
  { id: 'barbecue', nom: 'Barbecue', prix: 0, default: false },
  { id: 'blanche', nom: 'Blanche', prix: 0, default: false },
  { id: 'ketchup', nom: 'Ketchup', prix: 0, default: false },
  { id: 'biggy', nom: 'Biggy', prix: 0, default: false },
  { id: 'curry', nom: 'Curry', prix: 0, default: false },
  { id: 'harissa', nom: 'Harissa', prix: 0, default: false },
  { id: 'samourai', nom: 'Samouraï', prix: 0, default: false }
];

// Ingrédients de base
const baseIngredients = [
  { id: 'frites', nom: 'Frites', prix: 0, removable: false },
  { id: 'sauce-fromagere', nom: 'Sauce fromagère maison', prix: 0, removable: false }
];

// Suppléments
const supplements = [
  { nom: 'Gratiné', prix: 1.20 },
  { nom: 'Cheddar', prix: 1.08 },
  { nom: 'Raclette', prix: 1.08 },
  { nom: 'Kiri', prix: 1.08 },
  { nom: 'Chèvre', prix: 1.08 },
  { nom: 'Mozza', prix: 1.08 },
  { nom: 'Oignon', prix: 0.60 },
  { nom: 'Tomates', prix: 0.60 },
  { nom: 'Lardons', prix: 0.60 },
  { nom: 'Bacon', prix: 0.60 },
  { nom: 'Blanc de poulet', prix: 0.60 },
  { nom: 'Miel', prix: 0.60 },
  { nom: 'Frites Petite', prix: 1.80 },
  { nom: 'Frites Grande', prix: 3.60 }
];

async function fixTacosOptions() {
  try {
    console.log('🔍 Recherche du restaurant O Toasty...\n');

    // 1. Trouver le restaurant
    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, nom')
      .or('nom.ilike.%toasty%,nom.ilike.%o toasty%');

    if (restaurantError) {
      console.error('❌ Erreur recherche restaurant:', restaurantError);
      return;
    }

    if (!restaurants || restaurants.length === 0) {
      console.error('❌ Restaurant O Toasty non trouvé');
      return;
    }

    const restaurant = restaurants[0];
    console.log(`✅ Restaurant trouvé: ${restaurant.nom} (ID: ${restaurant.id})\n`);

    // 2. Trouver les tacos
    const { data: tacos, error: tacosError } = await supabase
      .from('menus')
      .select('id, nom, category')
      .eq('restaurant_id', restaurant.id)
      .or('nom.ilike.%tacos%,category.ilike.%tacos%');

    if (tacosError) {
      console.error('❌ Erreur recherche tacos:', tacosError);
      return;
    }

    if (!tacos || tacos.length === 0) {
      console.error('❌ Aucun tacos trouvé pour ce restaurant');
      return;
    }

    console.log(`📋 ${tacos.length} tacos trouvés:\n`);
    tacos.forEach(t => console.log(`  - ${t.nom} (${t.category})`));
    console.log('');

    // 3. Mettre à jour chaque tacos
    for (const taco of tacos) {
      const isM = taco.nom.includes('M') || taco.nom.includes('1 Viande');
      const isL = taco.nom.includes('L') || taco.nom.includes('2 Viandes');
      const isXL = taco.nom.includes('XL') || taco.nom.includes('3 Viandes');

      const updateData = {
        meat_options: meatOptions,
        sauce_options: sauceOptions,
        base_ingredients: baseIngredients,
        supplements: supplements,
        requires_meat_selection: true,
        requires_sauce_selection: false,
        max_sauces: 2
      };

      if (isM) {
        updateData.max_meats = 1;
      } else if (isL) {
        updateData.max_meats = 2;
      } else if (isXL) {
        updateData.max_meats = 3;
      } else {
        // Par défaut, 1 viande
        updateData.max_meats = 1;
      }

      console.log(`🔄 Mise à jour: ${taco.nom}...`);
      console.log(`   - Viandes: ${meatOptions.length} options, max: ${updateData.max_meats}`);
      console.log(`   - Sauces: ${sauceOptions.length} options, max: ${updateData.max_sauces}`);
      console.log(`   - Suppléments: ${supplements.length} options`);

      const { error: updateError } = await supabase
        .from('menus')
        .update(updateData)
        .eq('id', taco.id);

      if (updateError) {
        console.error(`   ❌ Erreur: ${updateError.message}`);
      } else {
        console.log(`   ✅ Mis à jour avec succès\n`);
      }
    }

    // 4. Vérifier le résultat
    console.log('🔍 Vérification finale...\n');
    const { data: updatedTacos, error: verifyError } = await supabase
      .from('menus')
      .select('id, nom, meat_options, sauce_options, supplements, max_meats, max_sauces')
      .eq('restaurant_id', restaurant.id)
      .or('nom.ilike.%tacos%,category.ilike.%tacos%');

    if (verifyError) {
      console.error('❌ Erreur vérification:', verifyError);
      return;
    }

    console.log('📊 Résultat final:\n');
    updatedTacos.forEach(taco => {
      const meatCount = Array.isArray(taco.meat_options) ? taco.meat_options.length : 0;
      const sauceCount = Array.isArray(taco.sauce_options) ? taco.sauce_options.length : 0;
      const suppCount = Array.isArray(taco.supplements) ? taco.supplements.length : 0;
      
      console.log(`  ${taco.nom}:`);
      console.log(`    - Viandes: ${meatCount} options (max: ${taco.max_meats || 'N/A'})`);
      console.log(`    - Sauces: ${sauceCount} options (max: ${taco.max_sauces || 'N/A'})`);
      console.log(`    - Suppléments: ${suppCount} options`);
      console.log('');
    });

    console.log('✅ Correction terminée !');
    console.log('💡 Si les options ne s\'affichent toujours pas, vérifiez :');
    console.log('   1. Le cache du navigateur (Ctrl+Shift+R ou Cmd+Shift+R)');
    console.log('   2. Les logs de la console du navigateur');
    console.log('   3. Les logs de l\'API dans Vercel');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

fixTacosOptions();


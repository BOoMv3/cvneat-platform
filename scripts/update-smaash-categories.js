/**
 * Script pour mettre à jour les catégories des plats SMAASH BURGER
 * Restaurant ID: 263b0421-112e-4d16-95c7-4deef6f5ff42
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Charger les variables d'environnement depuis .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Si les variables ne sont pas définies, essayer de les lire depuis .env.local
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  try {
    const envFile = readFileSync(envPath, 'utf8');
    const envVars = {};
    envFile.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
    SUPABASE_URL = SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
    SUPABASE_SERVICE_KEY = SUPABASE_SERVICE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;
  } catch (err) {
    console.error('⚠️  Impossible de lire .env.local:', err.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RESTAURANT_ID = '263b0421-112e-4d16-95c7-4deef6f5ff42'; // Smaash Burger

// Mapping des plats par catégorie
const CATEGORIES_MAP = {
  // Burgers
  'Classic Smaash Burger': 'burger',
  'Classic Smaash Bacon': 'burger',
  'Classique smaash burger': 'burger',
  'Classic smaash bacon': 'burger',
  'Le Montagnard': 'burger',
  'Le Spicy Crispy Chicken': 'burger',
  'Le CVNOL': 'burger',
  'L\'All Black': 'burger',
  
  // Poke Bowl
  'Poke bowl Saumon': 'poke bowl',
  'Poke Bowl Saumon': 'poke bowl',
  'Poke Bowl Spicy Crispy Chicken': 'poke bowl',
  'Poke Bowl Falafel': 'poke bowl',
  
  // Salades
  'Salade de chèvre chaud': 'salade',
  'Salade césar': 'salade',
  'Salade de poulpe': 'salade',
  'Salade camembert': 'salade',
  
  // Menu Bambin
  'Menu Bambin': 'plat'
};

async function updateCategories() {
  console.log('🚀 Mise à jour des catégories des plats SMAASH BURGER\n');
  console.log(`📍 Restaurant ID: ${RESTAURANT_ID}\n`);

  // 1. Récupérer tous les plats du restaurant
  const { data: menus, error: menusError } = await supabaseAdmin
    .from('menus')
    .select('id, nom, category')
    .eq('restaurant_id', RESTAURANT_ID);

  if (menusError) {
    console.error('❌ Erreur lors de la récupération des plats:', menusError.message);
    process.exit(1);
  }

  if (!menus || menus.length === 0) {
    console.log('❌ Aucun plat trouvé pour ce restaurant');
    process.exit(1);
  }

  console.log(`📋 ${menus.length} plat(s) trouvé(s)\n`);

  // 2. Mettre à jour les catégories
  let updatedCount = 0;
  let skippedCount = 0;
  const results = [];

  for (const menu of menus) {
    const newCategory = CATEGORIES_MAP[menu.nom];
    
    if (!newCategory) {
      console.log(`⚠️  Catégorie non définie pour: "${menu.nom}" (catégorie actuelle: ${menu.category || 'Aucune'})`);
      skippedCount++;
      continue;
    }

    // Vérifier si la catégorie doit être mise à jour
    if (menu.category === newCategory) {
      console.log(`✓ "${menu.nom}" a déjà la catégorie "${newCategory}"`);
      skippedCount++;
      continue;
    }

    try {
      const { error: updateError } = await supabaseAdmin
        .from('menus')
        .update({ category: newCategory })
        .eq('id', menu.id);

      if (updateError) {
        console.error(`❌ Erreur pour "${menu.nom}":`, updateError.message);
        results.push({ item: menu.nom, status: 'error', error: updateError.message });
      } else {
        console.log(`✅ "${menu.nom}" → "${newCategory}"`);
        updatedCount++;
        results.push({ item: menu.nom, status: 'success', oldCategory: menu.category, newCategory });
      }

      // Petit délai pour éviter les erreurs de taux
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (err) {
      console.error(`❌ Exception pour "${menu.nom}":`, err.message);
      results.push({ item: menu.nom, status: 'error', error: err.message });
    }
  }

  // 3. Afficher le résumé
  console.log('\n' + '='.repeat(60));
  console.log('📊 Résumé:');
  console.log('='.repeat(60));
  console.log(`✅ Mis à jour: ${updatedCount}`);
  console.log(`⏭️  Ignorés: ${skippedCount}`);
  console.log(`📋 Total: ${menus.length}`);

  // Afficher par catégorie
  console.log('\n📂 Plats par catégorie:');
  const { data: updatedMenus } = await supabaseAdmin
    .from('menus')
    .select('nom, category')
    .eq('restaurant_id', RESTAURANT_ID);

  const byCategory = {};
  (updatedMenus || []).forEach(m => {
    const cat = m.category || 'Non catégorisé';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(m.nom);
  });

  Object.keys(byCategory).sort().forEach(cat => {
    console.log(`\n  ${cat}:`);
    byCategory[cat].forEach(nom => console.log(`    - ${nom}`));
  });

  console.log('\n✨ Terminé!');
}

updateCategories().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});


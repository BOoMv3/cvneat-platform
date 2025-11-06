/**
 * Script pour ajouter le menu SMAASH BURGER
 * Restaurant ID: c0c9a54a-5041-4e40-abac-81be577bef84
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
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RESTAURANT_ID = '263b0421-112e-4d16-95c7-4deef6f5ff42'; // Smaash Burger

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

async function main() {
  console.log('🚀 Début de l\'ajout du menu SMAASH BURGER\n');
  console.log(`📍 Restaurant ID: ${RESTAURANT_ID}\n`);

  // 1. Vérifier que le restaurant existe
  const { data: restaurants, error: restaurantError } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom')
    .eq('id', RESTAURANT_ID);

  if (restaurantError) {
    console.error('❌ Erreur lors de la recherche du restaurant');
    console.error('Erreur:', restaurantError.message);
    process.exit(1);
  }

  if (!restaurants || restaurants.length === 0) {
    console.error('❌ Restaurant non trouvé avec cet ID:', RESTAURANT_ID);
    console.error('\n💡 Vérifiez que l\'ID du restaurant est correct dans la base de données.');
    process.exit(1);
  }

  const restaurant = restaurants[0];

  console.log(`✅ Restaurant trouvé: ${restaurant.nom}\n`);

  // 2. Vérifier les plats existants
  const { data: existingMenus, error: existingError } = await supabaseAdmin
    .from('menus')
    .select('id, nom')
    .eq('restaurant_id', RESTAURANT_ID);

  if (existingError) {
    console.error('❌ Erreur lors de la récupération des plats existants:', existingError.message);
    process.exit(1);
  }

  const existingNames = new Set((existingMenus || []).map(m => m.nom.toLowerCase()));

  if (existingMenus && existingMenus.length > 0) {
    console.log(`⚠️  Le restaurant a déjà ${existingMenus.length} plat(s) dans sa carte:`);
    existingMenus.forEach(m => console.log(`   - ${m.nom}`));
    console.log('');
  }

  // 3. Filtrer les plats à ajouter (exclure ceux qui existent déjà)
  const itemsToAdd = SMAASH_MENU.filter(item => !existingNames.has(item.nom.toLowerCase()));

  if (itemsToAdd.length === 0) {
    console.log('✅ Tous les plats existent déjà dans le menu !');
    process.exit(0);
  }

  console.log(`📝 ${itemsToAdd.length} nouveau(x) plat(s) à ajouter sur ${SMAASH_MENU.length}:\n`);

  // 4. Ajouter les plats
  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (const item of itemsToAdd) {
    try {
      const menuData = {
        restaurant_id: RESTAURANT_ID,
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
        console.error(`❌ Erreur pour "${item.nom}":`, error.message);
        errorCount++;
        results.push({ item: item.nom, status: 'error', error: error.message });
      } else {
        console.log(`✅ Ajouté: ${item.nom} - ${item.prix}€`);
        successCount++;
        results.push({ item: item.nom, status: 'success', id: data.id });
      }

      // Petit délai pour éviter les erreurs de taux
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error(`❌ Exception pour "${item.nom}":`, err.message);
      errorCount++;
      results.push({ item: item.nom, status: 'error', error: err.message });
    }
  }

  // 5. Afficher le résumé
  console.log('\n' + '='.repeat(60));
  console.log('📊 Résumé:');
  console.log('='.repeat(60));
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`📦 Plats existants: ${existingMenus?.length || 0}`);
  console.log(`📝 Nouveaux plats ajoutés: ${successCount}`);
  console.log(`📋 Total dans le menu: ${(existingMenus?.length || 0) + successCount}`);

  if (errorCount > 0) {
    console.log('\n❌ Erreurs détaillées:');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`   - ${r.item}: ${r.error}`);
    });
  }

  console.log('\n✨ Terminé!');
}

main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});


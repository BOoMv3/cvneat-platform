/**
 * Ajoute les pâtes (carte labonnepate34.fr) et désactive salades / menu enfant.
 * Restaurant La Bonne Pâte — prod Supabase.
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
    const envVars = {};
    envFile.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
        }
      }
    });
    SUPABASE_URL = SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
    SUPABASE_SERVICE_KEY = SUPABASE_SERVICE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;
  } catch (err) {
    console.error('⚠️  Impossible de lire .env.local :', err.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables Supabase manquantes.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const RESTAURANT_ID = 'd6725fe6-59ec-413a-b39b-ddb960824999';

const pastaImage =
  'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80';

/** Pâtes — alignées sur labonnepate34.fr */
const PASTA_ITEMS = [
  {
    nom: 'Fusili Tomate & Basilic',
    prix: 13,
    category: 'Pâtes',
    description:
      'Sauce tomate San Marzano DOP, tomates cerises, tomates confites, huile d\'olive, basilic frais',
  },
  {
    nom: 'Spaghetti Carbonara',
    prix: 15,
    category: 'Pâtes',
    description: 'Guanciale, pecorino, Parmigiano, sauce au jaune d\'œuf',
  },
  {
    nom: 'Penne Rigate Gorgonzola',
    prix: 15,
    category: 'Pâtes',
    description: 'Crème de gorgonzola, Parmigiano, cerneaux de noix',
  },
  {
    nom: 'Penne Rigate Pesto & Burrata',
    prix: 15,
    category: 'Pâtes',
    description: 'Pesto de basilic, Parmigiano, pignons de pin, burrata',
  },
  {
    nom: 'Spaghetti Tartufo',
    prix: 17,
    category: 'Pâtes',
    description: 'Crème truffée, parmigiano, copeaux de truffe',
  },
];

/** Désactiver (pas proposé à emporter pour le moment) */
const DISABLE_PATTERNS = [
  /salade/i,
  /menu enfant/i,
  /menu-enfant/i,
];

async function upsertPasta(item) {
  const payload = {
    restaurant_id: RESTAURANT_ID,
    nom: item.nom,
    description: item.description,
    prix: item.prix,
    category: item.category,
    disponible: true,
    base_ingredients: [],
    supplements: [],
    image_url: pastaImage,
    is_drink: false,
    drink_size: null,
  };

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('menus')
    .select('id')
    .eq('restaurant_id', RESTAURANT_ID)
    .ilike('nom', item.nom)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Vérification ${item.nom}: ${fetchError.message}`);
  }

  if (existing) {
    const { error } = await supabaseAdmin.from('menus').update(payload).eq('id', existing.id);
    if (error) throw new Error(`Mise à jour ${item.nom}: ${error.message}`);
    console.log(`🔄 ${item.nom} mis à jour`);
  } else {
    const { error } = await supabaseAdmin.from('menus').insert([payload]);
    if (error) throw new Error(`Insertion ${item.nom}: ${error.message}`);
    console.log(`✅ ${item.nom} ajouté`);
  }
}

async function disableExcludedItems() {
  const { data: items, error } = await supabaseAdmin
    .from('menus')
    .select('id, nom, category, disponible')
    .eq('restaurant_id', RESTAURANT_ID);

  if (error) throw new Error(`Lecture menu: ${error.message}`);

  for (const item of items || []) {
    const label = `${item.nom || ''} ${item.category || ''}`;
    const shouldDisable = DISABLE_PATTERNS.some((re) => re.test(label));
    if (!shouldDisable || item.disponible === false) continue;

    const { error: updateError } = await supabaseAdmin
      .from('menus')
      .update({ disponible: false })
      .eq('id', item.id);

    if (updateError) {
      throw new Error(`Désactivation ${item.nom}: ${updateError.message}`);
    }
    console.log(`🚫 ${item.nom} désactivé`);
  }
}

async function fixDesserts() {
  const fixes = [
    { match: /tiramisu/i, prix: 7, disponible: true },
    { match: /pizzetta nocciolata/i, prix: 7, disponible: true },
  ];

  const { data: items, error } = await supabaseAdmin
    .from('menus')
    .select('id, nom, prix, disponible')
    .eq('restaurant_id', RESTAURANT_ID);

  if (error) throw new Error(`Lecture desserts: ${error.message}`);

  for (const item of items || []) {
    const rule = fixes.find((f) => f.match.test(item.nom || ''));
    if (!rule) continue;

    const { error: updateError } = await supabaseAdmin
      .from('menus')
      .update({ prix: rule.prix, disponible: rule.disponible })
      .eq('id', item.id);

    if (updateError) {
      throw new Error(`Correction ${item.nom}: ${updateError.message}`);
    }
    console.log(`🍰 ${item.nom} → ${rule.prix}€`);
  }
}

async function main() {
  console.log('🍝 Sync pâtes La Bonne Pâte\n');

  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom')
    .eq('id', RESTAURANT_ID)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    console.error('❌ Restaurant introuvable:', RESTAURANT_ID);
    process.exit(1);
  }

  console.log(`Restaurant: ${restaurant.nom}\n`);

  for (const pasta of PASTA_ITEMS) {
    await upsertPasta(pasta);
  }

  await fixDesserts();
  await disableExcludedItems();

  const { data: summary } = await supabaseAdmin
    .from('menus')
    .select('nom, category, prix, disponible')
    .eq('restaurant_id', RESTAURANT_ID)
    .order('category')
    .order('nom');

  console.log('\n📋 Menu actuel:');
  for (const row of summary || []) {
    const status = row.disponible === false ? ' (OFF)' : '';
    console.log(`  [${row.category}] ${row.nom} — ${row.prix}€${status}`);
  }

  console.log('\n✅ Terminé.');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});

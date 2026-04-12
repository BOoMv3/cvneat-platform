/**
 * Supprime les boissons ajoutées par add-la-bonne-pate-menu.js que tu n'avais pas.
 *
 * Usage:
 *   node scripts/remove-la-bonne-pate-extra-drinks.js --list
 *        (affiche toutes les boissons en BDD pour La Bonne Pâte)
 *   node scripts/remove-la-bonne-pate-extra-drinks.js --dry-run
 *        (affiche ce qui serait supprimé sans supprimer)
 *   node scripts/remove-la-bonne-pate-extra-drinks.js
 *        (supprime les boissons "script")
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
const DRY_RUN = process.argv.includes('--dry-run');
const LIST_ONLY = process.argv.includes('--list');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  try {
    const env = readFileSync(envPath, 'utf8');
    env.split('\n').forEach((line) => {
      const t = line.trim();
      if (t && !t.startsWith('#')) {
        const [k, ...v] = line.split('=');
        const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
        if (k?.trim() === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = val;
        if (k?.trim() === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_KEY = val;
      }
    });
  } catch (_) {}
}

// Noms des boissons que le script add-la-bonne-pate-menu.js avait dans sa liste
// Tu peux modifier cette liste pour garder celles que tu veux
const DRINKS_FROM_SCRIPT = [
  'Coca',
  'Ice-tea',
  'Coca Zéro',
  'Coca Cherry',
  'Orangina',
  'Tropico',
  'Schweppes Agrumes',
  'Oasis Tropical',
  'Oasis Pomme Cassis Framboise',
  'Fanta Orange',
  'Fanta Citron',
  'Hawaï',
  '7up',
  '7up Mojitos',
  'Perrier',
  "Petite Bouteille d'eau",
  'Saint Pellegrino',
  'Bouteille de Coca',
  'Red Bull',
  "Grande Bouteille d'Eau"
];

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: resto } = await supabase
    .from('restaurants')
    .select('id, nom')
    .or('nom.ilike.%bonne pâte%,nom.ilike.%bonne pate%')
    .maybeSingle();

  if (!resto) {
    console.error('❌ Restaurant La Bonne Pâte non trouvé');
    process.exit(1);
  }

  const { data: menus } = await supabase
    .from('menus')
    .select('id, nom, category, is_drink, prix')
    .eq('restaurant_id', resto.id);

  const allDrinks = (menus || []).filter(
    (m) => m.category === 'Boissons' || m.is_drink === true
  );

  if (LIST_ONLY) {
    console.log('\n=== Toutes les boissons en BDD pour La Bonne Pâte ===');
    allDrinks.forEach((m) => console.log(`  - ${m.nom} (${m.prix}€) [id: ${m.id}]`));
    console.log(`\nTotal: ${allDrinks.length} boissons\n`);
    return;
  }

  const toRemove = allDrinks.filter(
    (m) =>
      (m.category === 'Boissons' || m.is_drink === true) &&
      DRINKS_FROM_SCRIPT.some((name) => (m.nom || '').trim().toLowerCase() === name.trim().toLowerCase())
  );

  if (toRemove.length === 0) {
    console.log('\n✅ Aucune boisson "script" à supprimer.\n');
    return;
  }

  console.log('\n=== Boissons à supprimer (ajoutées par le script) ===');
  toRemove.forEach((m) => console.log(`  - ${m.nom} (${m.prix}€)`));
  console.log('');

  if (DRY_RUN) {
    console.log('(--dry-run: aucune suppression effectuée)\n');
    return;
  }

  for (const m of toRemove) {
    const { error } = await supabase.from('menus').delete().eq('id', m.id);
    if (error) {
      console.error(`❌ Erreur suppression ${m.nom}:`, error.message);
    } else {
      console.log(`✅ Supprimé: ${m.nom}`);
    }
  }
  console.log('');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Affiche EXACTEMENT les prix que le front reçoit (réponse API menu)
 * pour La Bonne Pâte. À comparer avec la carte / add-la-bonne-pate-menu.js.
 * Usage: node scripts/affiche-prix-front-bonne-pate.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  try {
    const env = readFileSync(envPath, 'utf8');
    env.split('\n').forEach((line) => {
      const t = line.trim();
      if (t && !t.startsWith('#')) {
        const [k, ...v] = t.split('=');
        const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
        if (k === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = val;
        if (k === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_KEY = val;
      }
    });
  } catch (_) {}
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function slugify(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function run() {
  const { data: resto } = await supabase
    .from('restaurants')
    .select('id, nom')
    .or('nom.ilike.%bonne pâte%,nom.ilike.%bonne pate%')
    .maybeSingle();

  if (!resto) {
    console.error('Restaurant La Bonne Pâte non trouvé');
    process.exit(1);
  }

  const { data: menus } = await supabase
    .from('menus')
    .select('id, nom, prix, category, supplements')
    .eq('restaurant_id', resto.id)
    .eq('disponible', true)
    .order('category')
    .order('nom');

  console.log('\n=== PRIX ENVOYÉS AU FRONT (API /api/restaurants/[id]/menu) ===');
  console.log('Restaurant:', resto.nom);
  console.log('');

  const byCategory = (menus || []).reduce((acc, m) => {
    const cat = m.category || 'Autres';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  const orderCats = [
    'Pizzas - Base tomate',
    'Pizzas - Base crème',
    'Puccias',
    'Desserts',
    'Boissons',
    'Autres'
  ];

  for (const cat of orderCats) {
    const items = byCategory[cat];
    if (!items || items.length === 0) continue;
    console.log('---', cat, '---');
    for (const item of items) {
      const supps = Array.isArray(item.supplements) ? item.supplements : [];
      const jambon = supps.find((s) => /jambon/i.test(s?.nom || s?.name || ''));
      const oeuf = supps.find((s) => {
        const slug = slugify(s?.nom || s?.name || '');
        return slug === 'uf' || slug === 'oeuf' || s?.id === 'uf' || s?.id === 'oeuf';
      });
      const prixSupp = (s) => s?.prix ?? s?.prix_supplementaire ?? s?.price ?? 0;
      console.log(
        `  ${item.nom}: ${item.prix}€` +
          (jambon ? ` | jambon: ${prixSupp(jambon)}€` : '') +
          (oeuf ? ` | œuf: ${prixSupp(oeuf)}€` : '')
      );
    }
    console.log('');
  }

  console.log('(Source: table menus, colonnes prix + supplements — identique à la réponse API)\n');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

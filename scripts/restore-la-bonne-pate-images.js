/**
 * Remet les images sur le menu La Bonne Pâte (photos de remplacement).
 * Ce ne sont pas tes photos originales - des images génériques pour que le menu soit présentable.
 *
 * Usage: node scripts/restore-la-bonne-pate-images.js
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
        const [k, ...v] = line.split('=');
        const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
        if (k?.trim() === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = val;
        if (k?.trim() === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_KEY = val;
      }
    });
  } catch (_) {}
}

const imageMap = {
  Margherita: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  Reine: 'https://images.unsplash.com/photo-1601925260365-812f9ac6e8c7?auto=format&fit=crop&w=800&q=80',
  Paysanne: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=800&q=80',
  Chorizo: 'https://images.unsplash.com/photo-1612874471097-8c01c0ef1abb?auto=format&fit=crop&w=800&q=80',
  Bolo: 'https://images.unsplash.com/photo-1585238341986-44ef2b0b3d01?auto=format&fit=crop&w=800&q=80',
  Calzone: 'https://images.unsplash.com/photo-1603079842349-19b0ac2bf39b?auto=format&fit=crop&w=800&q=80',
  'Végétarienne': 'https://images.unsplash.com/photo-1545060894-1bf03c1a1e5a?auto=format&fit=crop&w=800&q=80',
  Coppa: 'https://images.unsplash.com/photo-1628840042765-356cda07504d?auto=format&fit=crop&w=800&q=80',
  'Flambée': 'https://images.unsplash.com/photo-1603079842378-9a7b6042f68d?auto=format&fit=crop&w=800&q=80',
  Chevrette: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  'Fromagère': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
  Tartiflette: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  Tartufata: 'https://images.unsplash.com/photo-1612874471097-8c01c0ef1abb?auto=format&fit=crop&w=800&q=80',
  Mortadella: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a48?auto=format&fit=crop&w=800&q=80',
  'La Puccia italienne': 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=800&q=80',
  'La Puccia végétarienne': 'https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&w=800&q=80',
  'La Puccia Tartufata': 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
  'La Puccia Mortadella': 'https://images.unsplash.com/photo-1453831210728-695502f9f795?auto=format&fit=crop&w=800&q=80',
  'La Puccia Coppa': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  'La Puccia Classique': 'https://images.unsplash.com/photo-1562967916-eb82221dfb36?auto=format&fit=crop&w=800&q=80',
  'La Puccia Cévenole': 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80',
  'Dessert du moment': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  'Pizzetta Nocciolata': 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=800&q=80',
  'Pizza du moment': 'https://images.unsplash.com/photo-1601925260365-812f9ac6e8c7?auto=format&fit=crop&w=800&q=80',
  Coca: 'https://i.ibb.co/233kmw1W/add61152e73b.png',
  'Ice-tea': 'https://i.ibb.co/y7hqJs3/ec23359c1343.png',
  'Coca Zéro': 'https://i.ibb.co/0Rzfkxv7/281cac2537ed.png',
  'Coca Cherry': 'https://i.ibb.co/p6G9qY2q/0b330aa71c23.png',
  Orangina: 'https://i.ibb.co/KQ1CCZj/e1df76135904.png',
  Tropico: 'https://i.ibb.co/nNTS8kBS/2711b66c70e6.png',
  'Schweppes Agrumes': 'https://i.ibb.co/Qjtvsp2t/834e3bff6c49.png',
  'Oasis Tropical': 'https://i.ibb.co/x8JC301z/ebf2917c6d24.png',
  'Oasis Pomme Cassis Framboise': 'https://i.ibb.co/Ps65skLQ/4813f00c23f7.png',
  'Fanta Orange': 'https://i.ibb.co/pjkB7rTw/0776741cd1d3.png',
  'Fanta Citron': 'https://i.ibb.co/SDq8xj9y/72b2a7fa921d.png',
  Hawaï: 'https://i.ibb.co/fd2GTWtn/21baa84755fa.png',
  '7up': 'https://i.ibb.co/w3yS8m2/0471ce6bc234.png',
  '7up Mojitos': 'https://i.ibb.co/4wSyyfGM/3b3489ddf2cf.png',
  Perrier: 'https://i.ibb.co/ccKS24B4/1479b4930f41.png',
  "Petite Bouteille d'eau": 'https://i.ibb.co/93bg7VBy/9158e27ce41d.png',
  'Saint Pellegrino': 'https://i.ibb.co/LX2fWhjv/14cc707e82a7.png',
  'Bouteille de Coca': 'https://i.ibb.co/F4Xjc5bD/1ec794e1d45b.png',
  'Red Bull': 'https://i.ibb.co/Xr1wNYCF/6a02174f0996.png',
  "Grande Bouteille d'Eau": 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80',
};

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
    .select('id, nom')
    .eq('restaurant_id', resto.id);

  console.log('\n📷 Remise des images sur le menu La Bonne Pâte...\n');

  let updated = 0;
  for (const m of menus || []) {
    const url = imageMap[m.nom] ?? imageMap[m.nom?.trim()];
    if (url) {
      const { error } = await supabase
        .from('menus')
        .update({ image_url: url })
        .eq('id', m.id);
      if (!error) {
        console.log(`  ✅ ${m.nom}`);
        updated++;
      } else {
        console.log(`  ❌ ${m.nom}: ${error.message}`);
      }
    }
  }

  console.log(`\n✨ ${updated} images mises à jour.\n`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

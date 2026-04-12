/**
 * Compare les prix SOURCE (add-la-bonne-pate-menu.js) vs BDD
 * Affiche les écarts et corrige si --fix passé.
 * Usage: node scripts/verify-la-bonne-pate-prices.js [--fix]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
const FIX = process.argv.includes('--fix');

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

const slugify = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// === SOURCE DE VÉRITÉ : copiée de add-la-bonne-pate-menu.js ===
const ingredientMeta = [
  { name: 'Base tomate', type: 'other' },
  { name: 'Base crème', type: 'other' },
  { name: 'Crème truffée', type: 'other', prix: 2 },
  { name: 'Crème de truffe', type: 'other', prix: 2 },
  { name: 'Pesto de basilic', type: 'other' },
  { name: 'Roquette', type: 'other' },
  { name: 'Tomates confites', type: 'other' },
  { name: 'Crème de balsamique', type: 'other' },
  { name: 'Oignons', type: 'other' },
  { name: 'Oignons rouges', type: 'other' },
  { name: 'Champignons shiitaké', type: 'other' },
  { name: 'Éclats de pistache', type: 'other' },
  { name: 'Pommes de terre', type: 'other' },
  { name: 'Miel', type: 'other' },
  { name: "Huile d'olive", type: 'other' },
  { name: 'Burrata', type: 'cheese', prix: 4 },
  { name: 'Mozzarella Fior Di Latte', type: 'cheese' },
  { name: 'Parmigiano', type: 'cheese' },
  { name: 'Taleggio', type: 'cheese' },
  { name: 'Gorgonzola', type: 'cheese' },
  { name: 'Reblochon', type: 'cheese' },
  { name: 'Pélardon', type: 'cheese' },
  { name: 'Stracciatella à la truffe', type: 'cheese' },
  { name: 'Jambon blanc', type: 'meat' },
  { name: 'Jambon cru', type: 'meat' },
  { name: 'Jambon blanc truffé', type: 'meat' },
  { name: 'Chorizo', type: 'meat' },
  { name: 'Viande hachée de boeuf', type: 'meat' },
  { name: 'Steak de boeuf 150g', type: 'meat' },
  { name: 'Lard fumé', type: 'meat' },
  { name: 'Coppa', type: 'meat' },
  { name: 'Mortadella', type: 'meat' },
  { name: 'Œuf', type: 'other' },
  { name: 'Cerneaux de noix', type: 'other' }
];

const supplementsRef = Array.from(
  ingredientMeta.reduce((map, ing) => {
    const key = slugify(ing.name);
    if (!map.has(key)) {
      const prix = ing.prix != null ? ing.prix : (ing.type === 'meat' ? 2 : ing.type === 'cheese' ? 1 : 1);
      map.set(key, { id: key, nom: ing.name, prix });
    }
    return map;
  }, new Map())
).map(([, v]) => v);

const menuRef = [
  { nom: 'Margherita', prix: 11 },
  { nom: 'Reine', prix: 13 },
  { nom: 'Paysanne', prix: 13 },
  { nom: 'Chorizo', prix: 13 },
  { nom: 'Bolo', prix: 14 },
  { nom: 'Calzone', prix: 14.5 },
  { nom: 'Végétarienne', prix: 16 },
  { nom: 'Coppa', prix: 18 },
  { nom: 'Flambée', prix: 12 },
  { nom: 'Chevrette', prix: 14 },
  { nom: 'Fromagère', prix: 13 },
  { nom: 'Tartiflette', prix: 14 },
  { nom: 'Tartufata', prix: 18 },
  { nom: 'Mortadella', prix: 18 },
  { nom: 'La Puccia italienne', prix: 10 },
  { nom: 'La Puccia végétarienne', prix: 10 },
  { nom: 'La Puccia Tartufata', prix: 12 },
  { nom: 'La Puccia Mortadella', prix: 10 },
  { nom: 'La Puccia Coppa', prix: 10 },
  { nom: 'La Puccia Classique', prix: 10 },
  { nom: 'La Puccia Cévenole', prix: 10 },
  { nom: 'Dessert du moment', prix: 4 },
  { nom: 'Pizzetta Nocciolata', prix: 7 },
  { nom: 'Coca', prix: 2 },
  { nom: 'Ice-tea', prix: 2 },
  { nom: 'Coca Zéro', prix: 2 },
  { nom: 'Coca Cherry', prix: 2 },
  { nom: 'Orangina', prix: 2 },
  { nom: 'Tropico', prix: 2 },
  { nom: 'Schweppes Agrumes', prix: 2 },
  { nom: 'Oasis Tropical', prix: 2 },
  { nom: 'Oasis Pomme Cassis Framboise', prix: 2 },
  { nom: 'Fanta Orange', prix: 2 },
  { nom: 'Fanta Citron', prix: 2 },
  { nom: 'Hawaï', prix: 2 },
  { nom: '7up', prix: 2 },
  { nom: '7up Mojitos', prix: 2 },
  { nom: 'Perrier', prix: 2 },
  { nom: "Petite Bouteille d'eau", prix: 1.8 },
  { nom: 'Saint Pellegrino', prix: 3 },
  { nom: 'Bouteille de Coca', prix: 4.8 },
  { nom: 'Red Bull', prix: 3 },
  { nom: "Grande Bouteille d'Eau", prix: 2.4 }
];

function getRefPrix(nom) {
  const r = menuRef.find((m) => m.nom.trim().toLowerCase() === nom?.trim().toLowerCase());
  return r?.prix;
}

function getRefSupplement(s) {
  const nom = s?.nom || s?.name || '';
  const slug = slugify(nom);
  const isOeuf = slug === 'uf' || slug === 'oeuf';
  return supplementsRef.find((r) => {
    const rs = slugify(r.nom);
    return rs === slug || (isOeuf && (rs === 'uf' || rs === 'oeuf'));
  }) || (isOeuf ? { prix: 1 } : null);
}

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
    .select('id, nom, prix, category, supplements')
    .eq('restaurant_id', resto.id)
    .eq('disponible', true);

  console.log('\n=== VÉRIFICATION PRIX LA BONNE PÂTE ===');
  console.log('Source: add-la-bonne-pate-menu.js (identique au front attendu)');
  console.log('BDD: table menus\n');

  let erreursPrix = 0;
  let erreursSupp = 0;

  for (const m of menus || []) {
    const refPrix = getRefPrix(m.nom);
    const dbPrix = parseFloat(m.prix);
    const refVal = refPrix != null ? parseFloat(refPrix) : null;

    if (refVal != null && Math.abs(dbPrix - refVal) > 0.001) {
      erreursPrix++;
      console.log(`❌ ${m.nom}: BDD=${dbPrix}€ | SOURCE=${refVal}€`);
      if (FIX) {
        const { error } = await supabase.from('menus').update({ prix: refVal }).eq('id', m.id);
        if (!error) console.log(`   → Corrigé ${m.nom} = ${refVal}€`);
        else console.error(`   → Erreur: ${error.message}`);
      }
    }

    const supps = Array.isArray(m.supplements) ? m.supplements : [];
    let needsSuppFix = false;
    const correctedSupps = supps.map((s) => {
      const ref = getRefSupplement(s);
      const dbP = parseFloat(s?.prix ?? s?.prix_supplementaire ?? s?.price ?? 0);
      const refP = ref?.prix != null ? parseFloat(ref.prix) : null;
      if (refP != null && Math.abs(dbP - refP) > 0.001) {
        erreursSupp++;
        needsSuppFix = true;
        console.log(`❌ Supplément [${m.nom}]: ${s?.nom || s?.name} BDD=${dbP}€ | SOURCE=${refP}€`);
        const prix = refP;
        return { ...s, prix, prix_supplementaire: prix };
      }
      return s;
    });
    if (FIX && needsSuppFix) {
      const { error } = await supabase.from('menus').update({ supplements: correctedSupps }).eq('id', m.id);
      if (!error) console.log(`   → Suppléments corrigés pour ${m.nom}`);
      else console.error(`   → Erreur: ${error.message}`);
    }
  }

  console.log('');
  if (erreursPrix === 0 && erreursSupp === 0) {
    console.log('✅ Aucun écart trouvé. BDD = source front.');
  } else {
    console.log(`📋 Résumé: ${erreursPrix} prix articles incorrects, ${erreursSupp} suppléments incorrects`);
    if (!FIX) {
      console.log('\nPour corriger: node scripts/verify-la-bonne-pate-prices.js --fix');
    } else {
      console.log('\n✅ Corrections appliquées.');
    }
  }
  console.log('');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

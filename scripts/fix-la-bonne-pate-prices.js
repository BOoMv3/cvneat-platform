/**
 * Corrige les prix La Bonne Pâte en utilisant EXACTEMENT les prix du script menu (source front)
 * Usage: node scripts/fix-la-bonne-pate-prices.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Charger les variables d'environnement
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const envPath = join(__dirname, '..', '.env.local');
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

// Prix et suppléments EXACTS du script add-la-bonne-pate-menu.js (source du front)
const ingredientMeta = [
  { name: 'Base tomate', type: 'other' },
  { name: 'Base crème', type: 'other' },
  { name: 'Crème truffée', type: 'other' },
  { name: 'Crème de truffe', type: 'other' },
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
  { name: 'Burrata', type: 'cheese' },
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

const slugify = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const supplementsFromFront = ingredientMeta.map((ing) => ({
  id: slugify(ing.name),
  nom: ing.name,
  prix: ing.type === 'meat' ? 2 : ing.type === 'cheese' ? 1 : 1,
  prix_supplementaire: ing.type === 'meat' ? 2 : ing.type === 'cheese' ? 1 : 1
}));

// Tous les articles + prix EXACTS de add-la-bonne-pate-menu.js (ce que le front doit afficher)
const menuItemsFromFront = [
  { nom: 'Margherita', prix: 11 },
  { nom: 'Reine', prix: 13 },
  { nom: 'Paysanne', prix: 13 },
  { nom: 'Chorizo', prix: 13 },
  { nom: 'Bolo', prix: 14 },
  { nom: 'Calzone', prix: 13.5 },
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
  { nom: 'Coca', prix: 2.5 },
  { nom: 'Ice-tea', prix: 2.5 },
  { nom: 'Coca Zéro', prix: 2.5 },
  { nom: 'Coca Cherry', prix: 2.5 },
  { nom: 'Orangina', prix: 2.5 },
  { nom: 'Tropico', prix: 2.5 },
  { nom: 'Schweppes Agrumes', prix: 2.5 },
  { nom: 'Oasis Tropical', prix: 2.5 },
  { nom: 'Oasis Pomme Cassis Framboise', prix: 2.5 },
  { nom: 'Fanta Orange', prix: 2.5 },
  { nom: 'Fanta Citron', prix: 2.5 },
  { nom: 'Hawaï', prix: 2.5 },
  { nom: '7up', prix: 2.5 },
  { nom: '7up Mojitos', prix: 2.5 },
  { nom: 'Perrier', prix: 2.5 },
  { nom: "Petite Bouteille d'eau", prix: 1.2 },
  { nom: 'Saint Pellegrino', prix: 3 },
  { nom: 'Bouteille de Coca', prix: 4.8 },
  { nom: 'Red Bull', prix: 3 },
  { nom: "Grande Bouteille d'Eau", prix: 2.4 }
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

  console.log('🍕 Correction des prix pour:', resto.nom);
  console.log('   Source: add-la-bonne-pate-menu.js (prix du front)\n');

  let updatedPrix = 0;
  let updatedSupplements = 0;

  for (const item of menuItemsFromFront) {
    const { data: menus } = await supabase
      .from('menus')
      .select('id, nom, prix, supplements')
      .eq('restaurant_id', resto.id)
      .ilike('nom', item.nom)
      .limit(1);

    if (!menus || menus.length === 0) continue;

    const m = menus[0];
    const updates = {};
    if (parseFloat(m.prix) !== parseFloat(item.prix)) {
      updates.prix = item.prix;
    }
    if (m.supplements && Array.isArray(m.supplements) && m.supplements.length > 0) {
      const corrected = m.supplements.map((s) => {
        const nomRaw = s?.nom || s?.name || '';
        const slug = slugify(nomRaw);
        // Œuf: en BDD le nom peut être "Œuf", "œuf", "Oeuf" -> slug "uf" ou "oeuf"
        const isOeuf = slug === 'uf' || slug === 'oeuf';
        const ref = isOeuf
          ? supplementsFromFront.find((r) => slugify(r.nom) === 'uf' || slugify(r.nom) === 'oeuf')
          : supplementsFromFront.find(
              (r) => r.nom === nomRaw || slugify(r.nom) === slug
            );
        const correctPrix = ref ? ref.prix : (isOeuf ? 1 : (s?.prix ?? s?.prix_supplementaire ?? 0));
        return {
          ...s,
          id: s?.id || (isOeuf ? 'oeuf' : slugify(nomRaw)),
          nom: s?.nom || s?.name || ref?.nom,
          prix: correctPrix,
          prix_supplementaire: correctPrix
        };
      });
      if (JSON.stringify(corrected) !== JSON.stringify(m.supplements)) {
        updates.supplements = corrected;
      }
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('menus')
        .update(updates)
        .eq('id', m.id);
      if (!error) {
        if (updates.prix) updatedPrix++;
        if (updates.supplements) updatedSupplements++;
        console.log(`   ✅ ${m.nom}: prix=${item.prix}€${updates.supplements ? ' + suppléments corrigés' : ''}`);
      } else {
        console.error(`   ❌ ${m.nom}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Terminé: ${updatedPrix} prix mis à jour, ${updatedSupplements} suppléments corrigés`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

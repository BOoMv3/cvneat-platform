/**
 * Seed Deliss'King menu into Supabase `menus` (and `menu_categories` if present).
 *
 * Usage:
 *   node scripts/seed-delissking-menu.js
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function readEnvFile(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function envGet(envText, key) {
  const re = new RegExp(
    '^' + key.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '=(.*)$',
    'm'
  );
  const m = envText.match(re);
  if (!m) return process.env[key];
  return m[1]
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/^'|'$/g, '');
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function normalizeKey(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Politique pricing: tu as confirmé que "tous les autres ont augmenté de 25%"
// pour compenser une commission de 20%. Donc on applique un markup x1.25 ici.
const PRICE_MARKUP_FACTOR = 1.25;
function roundToNearest(value, step = 0.05) {
  const n = parseFloat(value || 0) || 0;
  if (step <= 0) return parseFloat(n.toFixed(2));
  return Math.round(n / step) * step;
}
function applyMarkup(price) {
  const p = parseFloat(price || 0) || 0;
  if (p <= 0) return 0;
  return roundToNearest(p * PRICE_MARKUP_FACTOR, 0.05);
}
function applyMarkupToArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((x) => ({
    ...x,
    prix: applyMarkup(x.prix ?? x.price ?? 0)
  }));
}

async function main() {
  const envText = readEnvFile('.env.local');
  const url = envGet(envText, 'NEXT_PUBLIC_SUPABASE_URL');
  const key = envGet(envText, 'SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    console.error('❌ Variables Supabase manquantes (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const restaurantId = '05f7b5a8-31f4-47a1-a8dc-b8a39067af32'; // Deliss'King

  // Detect columns available in menus table (avoid breaking if columns missing)
  const { data: menuSample, error: sampleErr } = await sb.from('menus').select('*').limit(1);
  if (sampleErr) {
    console.error('❌ Impossible de lire la table menus:', sampleErr);
    process.exit(1);
  }
  const menuCols = new Set(Object.keys(menuSample?.[0] || {}));

  const hasCol = (c) => menuCols.has(c);

  const meatOptions = [
    'Cordon bleu',
    'Merguez',
    'Poulet',
    'Steak',
    'Kebab',
    'Tenders',
    'Falafel',
    'Nuggets',
  ].map((nom) => ({ nom, prix: 0, default: false, disponible: true }));

  const sauceOptions = [
    'Mayonnaise',
    'Ketchup',
    'Blanche',
    'Barbecue',
    'Brésil',
    'Magic Onion',
    'Biggy',
    'Curry',
    'Andalouse',
    'Harissa',
    'Algérienne',
    'Samouraï',
  ].map((nom) => ({ nom, prix: 0, default: false, disponible: true }));

  const extrasPlus1 = [
    'Raclette',
    'Cheddar',
    'Tomates',
    'Oignons rouge',
    'Oignons caramélisés',
    'Oignons frits',
    'Lardons',
    'Chèvre',
    'Bacon',
    'Boursin',
    'Haché qui rit',
    'Miel',
    'Chorizo',
    'Poivrons',
    'Galette de pommes de terre',
  ].map((nom) => ({ nom, prix: 1.0 }));

  const gratinTacosCheesePlus2 = [
    'Cheddar',
    'Mozzarella',
    'Chèvre',
    'Raclette',
  ].map((nom) => ({ nom: `Base fromage: ${nom}`, prix: 2.0 }));

  const gratinTacosGarniturePlus1 = [
    'Oignons frits',
    'Miel',
    'Lardons',
    'Bacon',
    'Oignons rouge',
    'Chorizo',
  ].map((nom) => ({ nom: `Garniture gratin: ${nom}`, prix: 1.0 }));

  const commonSupplements = uniqBy([...extrasPlus1], (s) => normalizeKey(s.nom));
  const gratinSupplements = uniqBy([...extrasPlus1, ...gratinTacosCheesePlus2, ...gratinTacosGarniturePlus1], (s) => normalizeKey(s.nom));

  // IMPORTANT: les prix ci-dessous sont les "prix base/flyer".
  // On appliquera un markup de +25% juste avant insertion.
  const items = [
    // TACOS "tailles"
    {
      category: 'Tacos',
      nom: 'Tacos (1 viande) - Simple',
      prix: 7.0,
      description: "Choisis 1 viande + sauces",
      // Inclure aussi les options de gratin (+2/+1) directement comme suppléments payants
      supplements: gratinSupplements,
      requires_meat_selection: true,
      max_meats: 1,
      requires_sauce_selection: true,
      max_sauces: 2,
      meat_options: meatOptions,
      sauce_options: sauceOptions,
    },
    {
      category: 'Tacos',
      nom: 'Tacos (2 viandes) - Double',
      prix: 8.5,
      description: "Choisis 2 viandes + sauces",
      supplements: gratinSupplements,
      requires_meat_selection: true,
      max_meats: 2,
      requires_sauce_selection: true,
      max_sauces: 2,
      meat_options: meatOptions,
      sauce_options: sauceOptions,
    },
    {
      category: 'Tacos',
      nom: 'Tacos (3 viandes) - XL',
      prix: 10.5,
      description: "Choisis 3 viandes + sauces",
      supplements: gratinSupplements,
      requires_meat_selection: true,
      max_meats: 3,
      requires_sauce_selection: true,
      max_sauces: 2,
      meat_options: meatOptions,
      sauce_options: sauceOptions,
    },

    // GRATINS
    {
      category: 'Gratins',
      nom: 'Gratin (1 viande) - Simple',
      prix: 8.0,
      description: "Choisis 1 viande + sauces",
      supplements: commonSupplements,
      requires_meat_selection: true,
      max_meats: 1,
      requires_sauce_selection: true,
      max_sauces: 2,
      meat_options: meatOptions,
      sauce_options: sauceOptions,
    },
    {
      category: 'Gratins',
      nom: 'Gratin (2 viandes) - Double',
      prix: 9.5,
      description: "Choisis 2 viandes + sauces",
      supplements: commonSupplements,
      requires_meat_selection: true,
      max_meats: 2,
      requires_sauce_selection: true,
      max_sauces: 2,
      meat_options: meatOptions,
      sauce_options: sauceOptions,
    },
    {
      category: 'Gratins',
      nom: 'Gratin (3 viandes) - XL',
      prix: 11.5,
      description: "Choisis 3 viandes + sauces",
      supplements: commonSupplements,
      requires_meat_selection: true,
      max_meats: 3,
      requires_sauce_selection: true,
      max_sauces: 2,
      meat_options: meatOptions,
      sauce_options: sauceOptions,
    },

    // SIGNATURES (séparer Tacos vs Gratins pour que ce soit cohérent)
    { category: 'Tacos signatures', nom: 'Tacos Seleção', prix: 10.0, description: 'Steak haché, tenders, bacon, gratiné cheddar, sauce Brésil', supplements: gratinSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Tacos signatures', nom: 'Tacos Gipsy', prix: 10.0, description: 'Steak haché, poivrons, oignons frits, chorizo, gratiné cheddar, sauce Andalouse', supplements: gratinSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Tacos signatures', nom: 'Tacos Spicy Bacon', prix: 11.0, description: 'Poulet, merguez, oignons rouges, bacon, gratiné mozzarella, sauce Algérienne', supplements: gratinSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Tacos signatures', nom: 'Tacos Raclette Crispy', prix: 10.0, description: 'Tenders, lardons, oignons frits, gratiné raclette', supplements: gratinSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Tacos signatures', nom: 'Tacos Chèvre & Miel', prix: 8.5, description: 'Tenders, gratiné chèvre, miel', supplements: gratinSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Tacos signatures', nom: 'Tacos Boursin', prix: 9.5, description: 'Cordon bleu, bacon, boursin, gratiné mozzarella', supplements: gratinSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },

    { category: 'Gratins signatures', nom: 'Gratin Montagnard', prix: 11.0, description: 'Gratiné raclette, tenders, lardons, oignons caramélisés, galette PDT', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Gratins signatures', nom: 'Gratin Chèvre & Miel', prix: 9.0, description: 'Gratiné mozza / chèvre, miel, poulet', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },

    // BURGERS (menu +3€ indiqué sur carte)
    { category: 'Burgers', nom: 'Méga Giant', prix: 8.5, description: '2x steak 100g, cheddar, salade, oignons, sauce giant', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Burgers', nom: 'Royal Bacon (1 viande)', prix: 5.5, description: 'Steak 100g, cheddar, bacon, oignons, cornichons, mayo/ketchup', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Burgers', nom: 'Royal Bacon (2 viandes)', prix: 8.0, description: '2x steak 100g, cheddar, bacon, oignons, cornichons, mayo/ketchup', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Burgers', nom: 'Raclette Deliss (1 viande)', prix: 6.5, description: 'Steak 100g, raclette, bacon, salade, oignons caramélisés, mayo', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Burgers', nom: 'Raclette Deliss (2 viandes)', prix: 9.0, description: '2x steak 100g, raclette, bacon, salade, oignons caramélisés, mayo', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Burgers', nom: 'Rosti Beef', prix: 6.5, description: 'Steak 100g, rösti, cheddar, salade, tomate, oignons, Magic Onion', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Burgers', nom: 'The Boursin (1 viande)', prix: 6.5, description: 'Steak 100g, boursin, salade, tomate, cheddar, oignons caramélisés', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Burgers', nom: 'The Boursin (2 viandes)', prix: 9.0, description: '2x steak 100g, boursin, salade, tomate, cheddar, oignons caramélisés', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Burgers', nom: "Big M'o", prix: 9.0, description: 'Steak 100g, chicken, cheddar, salade, tomate, oignons caramélisés, sauce biggy', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },

    // PETITS BURGERS
    { category: 'Petits burgers', nom: 'Chicken burger', prix: 6.0, description: 'Burger poulet', supplements: commonSupplements },
    { category: 'Petits burgers', nom: 'Fish burger', prix: 4.0, description: 'Burger poisson', supplements: commonSupplements },
    { category: 'Petits burgers', nom: "P'tit Giant", prix: 3.0, description: 'Petit burger', supplements: commonSupplements },
    { category: 'Petits burgers', nom: 'Giant', prix: 5.0, description: 'Burger', supplements: commonSupplements },

    // CHICKEN BURGERS
    { category: 'Chicken burgers', nom: 'Tower', prix: 8.0, description: 'Tenders, rösti, salade, tomate, cheddar, oignons frits, mayo', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Chicken burgers', nom: 'Chicken Raclette', prix: 8.0, description: 'Tenders, bacon, raclette, oignons frits & caramélisés, mayo', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Chicken burgers', nom: 'Kentucky', prix: 7.0, description: 'Tenders, bacon, salade, tomate, cheddar, oignons frits, sauce BBQ', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Chicken burgers', nom: 'Tyson', prix: 7.0, description: 'Tenders, bacon, salade, tomate, cheddar, oignons caramélisés, Brésil', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },

    // WRAPS
    { category: 'Wraps', nom: 'Wrap Tenders', prix: 7.0, description: 'Tenders crispy', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Wraps', nom: 'Wrap Tenders Bacon', prix: 7.5, description: 'Tenders crispy & bacon', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Wraps', nom: "Wrap Chick'n Beef", prix: 8.0, description: 'Tenders & steak', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Wraps', nom: 'Wrap Poulet', prix: 6.5, description: 'Filet de poulet', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },

    // SANDWICHS + KEBABS
    { category: 'Sandwichs', nom: 'Sandwich Steak', prix: 7.0, description: 'Steak, salade, tomate, oignons, cheddar', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Sandwichs', nom: 'Sandwich Merguez', prix: 7.0, description: 'Merguez, salade, tomate, oignons, cheddar', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Sandwichs', nom: 'Sandwich Poulet', prix: 7.0, description: 'Poulet, salade, tomate, oignons, cheddar', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Sandwichs', nom: 'Sandwich Tenders', prix: 7.0, description: 'Tenders, salade, tomate, oignons, cheddar', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Kebabs', nom: 'Pain Kebab', prix: 6.5, description: 'Kebab, salade, tomate, concombre, oignons rouge ou caramélisés', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Kebabs', nom: 'Pain Kebab gratiné', prix: 8.0, description: 'Kebab, salade, tomate, concombre, oignons rouge ou caramélisés, mozza', supplements: gratinSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Kebabs', nom: 'Galette Kebab', prix: 6.5, description: 'Kebab, salade, tomate, concombre, oignons rouge ou caramélisés', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Kebabs', nom: 'Maxi Galette Kebab', prix: 9.0, description: 'Kebab, salade, tomate, concombre, oignons rouge ou caramélisés', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },

    // SNACKS (p'tit plaisir)
    { category: "P'tit plaisir", nom: 'Nuggets x4', prix: 3.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: 'Nuggets x8', prix: 6.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: 'Tenders x5', prix: 6.0, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: 'Tenders x8', prix: 9.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: 'Mozza sticks x4', prix: 3.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: 'Mozza sticks x8', prix: 6.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: 'Chicken wings x4', prix: 4.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: 'Chicken wings x8', prix: 8.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: 'Camembert x4', prix: 3.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: 'Camembert x8', prix: 6.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: 'Oignons rings x4', prix: 2.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: 'Oignons rings x8', prix: 4.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: "Croq Deliss (bacon ou steak)", prix: 3.5, description: '', supplements: [] },
    { category: "P'tit plaisir", nom: "P'tit wrap", prix: 2.5, description: '', supplements: [] },

    // SALADES (8€)
    { category: 'Salades', nom: 'Salade Crispy', prix: 8.0, description: 'Tenders & bacon', supplements: [] },
    { category: 'Salades', nom: 'Salade Chicken', prix: 8.0, description: 'Poulet grillé', supplements: [] },
    { category: 'Salades', nom: 'Salade Camembert', prix: 8.0, description: 'Camembert pané & bacon', supplements: [] },
    { category: 'Salades', nom: 'Salade Mozza', prix: 8.0, description: 'Mozza sticks & bacon', supplements: [] },

    // DESSERTS
    { category: 'Desserts', nom: 'Tiramisu', prix: 4.0, description: '', supplements: [] },

    // BOISSONS
    { category: 'Boissons', nom: 'Boisson 33cl', prix: 2.0, description: '', supplements: [] },
    { category: 'Boissons', nom: 'Capri-Sun', prix: 1.0, description: '', supplements: [] },
    { category: 'Boissons', nom: 'Heineken', prix: 2.0, description: '', supplements: [] },
    { category: 'Boissons', nom: 'Desperados', prix: 3.0, description: '', supplements: [] },
    { category: 'Boissons', nom: 'Grande bouteille', prix: 4.0, description: '', supplements: [] },

    // FRITES
    { category: 'Frites', nom: 'Cornet de frites', prix: 2.5, description: '', supplements: [] },
    { category: 'Frites', nom: 'Frites cheddar', prix: 3.5, description: '', supplements: [] },
    { category: 'Frites', nom: 'Frites fromagère', prix: 3.5, description: '', supplements: [] },
    { category: 'Frites', nom: 'Frites cheddar bacon', prix: 4.5, description: '', supplements: [] },
    { category: 'Frites', nom: 'Frites fromagère bacon', prix: 4.5, description: '', supplements: [] },

    // Formules pas chères supprimées (1.90 / 2.50 / 3.75 affichées après markup)
    // On garde uniquement la vraie formule via menu_combos (Menu Burger).
  ];

  // Optional: create menu_categories if table exists
  let categoriesCreated = 0;
  try {
    const { data: catSample, error: catErr } = await sb.from('menu_categories').select('*').limit(1);
    if (!catErr) {
      const categories = [
        // Ordre pensé "comme une vraie carte"
        'Tacos',
        'Tacos signatures',
        'Gratins',
        'Gratins signatures',
        'Burgers',
        'Petits burgers',
        'Wraps',
        'Sandwichs',
        'Kebabs',
        "P'tit plaisir",
        'Salades',
        'Frites',
        'Boissons',
        'Desserts'
      ];
      const existing = await sb
        .from('menu_categories')
        .select('id,name')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);
      const existingNames = new Set((existing.data || []).map((c) => normalizeKey(c.name)));
      const toInsert = categories
        .map((name, idx) => ({
          restaurant_id: restaurantId,
          name,
          description: '',
          sort_order: idx,
        }))
        .filter((c) => !existingNames.has(normalizeKey(c.name)));
      if (toInsert.length > 0) {
        const { error: insCatErr } = await sb.from('menu_categories').insert(toInsert);
        if (!insCatErr) categoriesCreated = toInsert.length;
      }

      // Best-effort: renommer l'ancienne catégorie si elle existe
      try {
        await sb
          .from('menu_categories')
          .update({ name: 'Frites' })
          .eq('restaurant_id', restaurantId)
          .eq('name', 'Frites maison');
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore: table doesn't exist or no rights
  }

  // Fetch existing items for idempotency
  const { data: existingItems, error: existingErr } = await sb
    .from('menus')
    .select('id, nom, category')
    .eq('restaurant_id', restaurantId);

  if (existingErr) {
    console.error('❌ Erreur chargement menus existants:', existingErr);
    process.exit(1);
  }

  const existingMap = new Map(
    (existingItems || []).map((it) => [normalizeKey(`${it.category}||${it.nom}`), it.id])
  );

  let inserted = 0;
  let updated = 0;
  const plannedKeys = new Set(items.map((it) => normalizeKey(`${it.category}||${it.nom}`)));
  const insertedIdByKey = new Map();

  // Appliquer le markup sur tous les prix (articles + suppléments/options)
  const pricedItems = items.map((it) => {
    const out = { ...it };
    out.prix = applyMarkup(it.prix);
    if (Array.isArray(it.supplements)) out.supplements = applyMarkupToArray(it.supplements);
    if (Array.isArray(it.meat_options)) out.meat_options = applyMarkupToArray(it.meat_options);
    if (Array.isArray(it.sauce_options)) out.sauce_options = applyMarkupToArray(it.sauce_options);
    return out;
  });

  for (const item of pricedItems) {
    const key = normalizeKey(`${item.category}||${item.nom}`);
    const base = {
      restaurant_id: restaurantId,
      nom: item.nom,
      description: item.description || '',
      prix: typeof item.prix === 'number' ? item.prix : parseFloat(item.prix || 0),
      category: item.category,
      disponible: true,
    };

    // Attach optional json columns only if exist
    if (hasCol('supplements') && Array.isArray(item.supplements)) base.supplements = item.supplements;
    if (hasCol('meat_options') && Array.isArray(item.meat_options)) base.meat_options = item.meat_options;
    if (hasCol('sauce_options') && Array.isArray(item.sauce_options)) base.sauce_options = item.sauce_options;
    if (hasCol('requires_meat_selection') && item.requires_meat_selection !== undefined) base.requires_meat_selection = !!item.requires_meat_selection;
    if (hasCol('requires_sauce_selection') && item.requires_sauce_selection !== undefined) base.requires_sauce_selection = !!item.requires_sauce_selection;
    if (hasCol('max_sauces') && item.max_sauces !== undefined) base.max_sauces = item.max_sauces;
    if (hasCol('max_meats') && item.max_meats !== undefined) base.max_meats = item.max_meats;

    const existingId = existingMap.get(key);
    if (existingId) {
      const { data: upData, error: upErr } = await sb
        .from('menus')
        .update(base)
        .eq('id', existingId)
        .select('id')
        .single();
      if (upErr) {
        console.error('❌ Update failed for', item.category, item.nom, upErr.message);
      } else {
        updated += 1;
        insertedIdByKey.set(key, upData?.id || existingId);
      }
    } else {
      const { data: insData, error: insErr } = await sb
        .from('menus')
        .insert([base])
        .select('id')
        .single();
      if (insErr) {
        console.error('❌ Insert failed for', item.category, item.nom, insErr.message);
      } else {
        inserted += 1;
        if (insData?.id) insertedIdByKey.set(key, insData.id);
      }
    }
  }

  // Désactiver les items existants qui ne font plus partie de la carte seedée (évite le "bordel")
  try {
    const toDisable = (existingItems || [])
      .filter((it) => !plannedKeys.has(normalizeKey(`${it.category}||${it.nom}`)))
      .map((it) => it.id);
    if (toDisable.length > 0) {
      await sb.from('menus').update({ disponible: false }).in('id', toDisable);
    }
  } catch (e) {
    // ignore
  }

  // Créer des "Formules" propres via menu_combos (Menu Burger = Burger +3€ + frites + boisson)
  let combosCreated = 0;
  try {
    const { error: comboProbeErr } = await sb.from('menu_combos').select('id').limit(1);
    if (!comboProbeErr) {
      // Reset des combos de ce restaurant (cascade steps/options/variants)
      await sb.from('menu_combos').delete().eq('restaurant_id', restaurantId);

      // Construire la liste des burgers
      const burgerItems = pricedItems
        .filter((it) => it.category === 'Burgers')
        .map((it) => {
          const k = normalizeKey(`${it.category}||${it.nom}`);
          return {
            key: k,
            id: insertedIdByKey.get(k) || null,
            nom: it.nom,
            prix: typeof it.prix === 'number' ? it.prix : parseFloat(it.prix || 0)
          };
        })
        .filter((b) => b.id);

      // Boissons "menu" (softs + eau)
      const menuDrinkNameAllow = (name) => {
        const n = normalizeKey(name);
        return (
          n.includes('coca') ||
          n.includes('sprite') ||
          n.includes('fanta') ||
          n.includes('orangina') ||
          n.includes('oasis') ||
          n.includes('ice tea') ||
          n.includes('icetea') ||
          n.includes('the') ||
          n.includes('eau')
        );
      };
      const drinkItems = pricedItems
        .filter((it) => it.category === 'Boissons')
        .filter((it) => menuDrinkNameAllow(it.nom))
        .map((it) => {
          const k = normalizeKey(`${it.category}||${it.nom}`);
          return {
            key: k,
            id: insertedIdByKey.get(k) || null,
            nom: it.nom
          };
        })
        .filter((d) => d.id);

      if (burgerItems.length > 0) {
        const { data: combo, error: comboErr } = await sb
          .from('menu_combos')
          .insert([
            {
              restaurant_id: restaurantId,
              nom: 'Menu Burger (+3€)',
              description: 'Choisis ton burger + frites + boisson (surcharge menu +3€)',
              // NOTE: markup appliqué aussi sur la surcharge
              prix_base: applyMarkup(3.0),
              actif: true,
              ordre_affichage: 0
            }
          ])
          .select('id')
          .single();
        if (comboErr) throw comboErr;

        // Étape 1: Burger
        const { data: stepBurger, error: stepBurgerErr } = await sb
          .from('menu_combo_steps')
          .insert([
            {
              combo_id: combo.id,
              title: 'Burger',
              description: 'Choisis ton burger',
              min_selections: 1,
              max_selections: 1,
              ordre: 0
            }
          ])
          .select('id')
          .single();
        if (stepBurgerErr) throw stepBurgerErr;

        const burgerOptions = burgerItems.map((b, idx) => ({
          step_id: stepBurger.id,
          type: 'link_to_item',
          linked_menu_id: b.id,
          nom: b.nom,
          description: '',
          // IMPORTANT: le prix du burger est porté par le supplément de l'option.
          prix_supplementaire: parseFloat((b.prix || 0).toFixed(2)),
          image_url: null,
          disponible: true,
          ordre: idx
        }));
        const { error: burgerOptErr } = await sb.from('menu_combo_options').insert(burgerOptions);
        if (burgerOptErr) throw burgerOptErr;

        // Étape 2: Frites (incluses)
        const { data: stepSide, error: stepSideErr } = await sb
          .from('menu_combo_steps')
          .insert([
            {
              combo_id: combo.id,
              title: 'Accompagnement',
              description: 'Frites incluses',
              min_selections: 1,
              max_selections: 1,
              ordre: 1
            }
          ])
          .select('id')
          .single();
        if (stepSideErr) throw stepSideErr;
        const { error: sideOptErr } = await sb.from('menu_combo_options').insert([
          {
            step_id: stepSide.id,
            type: 'custom',
            linked_menu_id: null,
            nom: 'Frites',
            description: '',
            prix_supplementaire: 0,
            image_url: null,
            disponible: true,
            ordre: 0
          }
        ]);
        if (sideOptErr) throw sideOptErr;

        // Étape 3: Boisson (incluse)
        const { data: stepDrink, error: stepDrinkErr } = await sb
          .from('menu_combo_steps')
          .insert([
            {
              combo_id: combo.id,
              title: 'Boisson',
              description: 'Choisis ta boisson',
              min_selections: 1,
              max_selections: 1,
              ordre: 2
            }
          ])
          .select('id')
          .single();
        if (stepDrinkErr) throw stepDrinkErr;

        if (drinkItems.length > 0) {
          const drinkOptions = drinkItems.map((d, idx) => ({
            step_id: stepDrink.id,
            type: 'link_to_item',
            linked_menu_id: d.id,
            nom: d.nom,
            description: '',
            prix_supplementaire: 0,
            image_url: null,
            disponible: true,
            ordre: idx
          }));
          const { error: drinkOptErr } = await sb.from('menu_combo_options').insert(drinkOptions);
          if (drinkOptErr) throw drinkOptErr;
        } else {
          // Fallback: au moins une option "boisson du jour"
          const { error: drinkFallbackErr } = await sb.from('menu_combo_options').insert([
            {
              step_id: stepDrink.id,
              type: 'custom',
              linked_menu_id: null,
              nom: 'Boisson (au choix)',
              description: '',
              prix_supplementaire: 0,
              image_url: null,
              disponible: true,
              ordre: 0
            }
          ]);
          if (drinkFallbackErr) throw drinkFallbackErr;
        }

        combosCreated = 1;
      }
    }
  } catch (e) {
    console.warn('⚠️ Seed combos ignoré (tables combos absentes ou erreur):', e?.message || e);
  }

  console.log('✅ Seed Deliss’King terminé:', {
    restaurantId,
    categoriesCreated,
    inserted,
    updated,
    combosCreated,
    totalPlanned: items.length,
  });
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});



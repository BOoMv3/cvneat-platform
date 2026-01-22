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
  ].map((nom) => ({ nom, prix: 0, default: false }));

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

  const items = [
    // TACOS "tailles"
    {
      category: 'Tacos',
      nom: 'Tacos (1 viande) - Simple',
      prix: 7.0,
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
      category: 'Tacos',
      nom: 'Tacos (2 viandes) - Double',
      prix: 8.5,
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
      category: 'Tacos',
      nom: 'Tacos (3 viandes) - XL',
      prix: 10.5,
      description: "Choisis 3 viandes + sauces",
      supplements: commonSupplements,
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

    // GRATINE TON TACOS (options fromages + garnitures)
    {
      category: 'Tacos',
      nom: 'Option: Gratine ton tacos',
      prix: 0.0,
      description: "Base fromage +2€ et garniture +1€ (à ajouter à un tacos)",
      supplements: gratinSupplements,
      requires_meat_selection: false,
      requires_sauce_selection: false,
    },

    // SIGNATURES
    { category: 'Signatures', nom: 'Tacos Seleçao', prix: 10.0, description: 'Steak haché, tenders, bacon, gratiné cheddar, Brésil', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Signatures', nom: 'Tacos Gipsy', prix: 10.0, description: 'Steak haché, poivrons, oignons frits, chorizo, gratiné cheddar, Andalouse', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Signatures', nom: 'Tacos Spicy Bacon', prix: 11.0, description: 'Poulet, merguez, oignons rouge, bacon, gratiné mozzarella, Algérienne', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Signatures', nom: 'Gratin Montagnard', prix: 11.0, description: 'Gratiné raclette, tenders, lardons, oignons caramélisés, galette PDT', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Signatures', nom: 'Tacos Raclette Crispy', prix: 10.0, description: 'Tenders, lardons, oignons frits, gratiné raclette', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Signatures', nom: 'Tacos Chèvre & Miel', prix: 8.5, description: 'Tenders, gratiné chèvre miel', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Signatures', nom: 'Tacos Boursin', prix: 9.5, description: 'Cordon bleu, bacon, boursin, gratiné mozzarella', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },
    { category: 'Signatures', nom: 'Gratin Chèvre & Miel', prix: 9.0, description: 'Gratiné mozza / chèvre, miel, poulet', supplements: commonSupplements, requires_sauce_selection: true, max_sauces: 2, sauce_options: sauceOptions },

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

    // FRITES MAISON
    { category: 'Frites maison', nom: 'Cornet frites maison', prix: 2.5, description: '', supplements: [] },
    { category: 'Frites maison', nom: 'Frites cheddar', prix: 3.5, description: '', supplements: [] },
    { category: 'Frites maison', nom: 'Frites fromagère', prix: 3.5, description: '', supplements: [] },
    { category: 'Frites maison', nom: 'Frites cheddar bacon', prix: 4.5, description: '', supplements: [] },
    { category: 'Frites maison', nom: 'Frites fromagère bacon', prix: 4.5, description: '', supplements: [] },

    // FORMULES (sur la carte : +1.50 / +2.00 / +3.00)
    { category: 'Formules', nom: 'Formule tacos: Boisson 33cl', prix: 1.5, description: 'À ajouter', supplements: [] },
    { category: 'Formules', nom: 'Formule tacos: Cornet de frites', prix: 2.0, description: 'À ajouter', supplements: [] },
    { category: 'Formules', nom: 'Menu frites & boisson', prix: 3.0, description: 'À ajouter', supplements: [] },
  ];

  // Optional: create menu_categories if table exists
  let categoriesCreated = 0;
  try {
    const { data: catSample, error: catErr } = await sb.from('menu_categories').select('*').limit(1);
    if (!catErr) {
      const categories = [
        'Tacos',
        'Gratins',
        'Signatures',
        'Burgers',
        'Chicken burgers',
        'Wraps',
        'Sandwichs',
        'Kebabs',
        "P'tit plaisir",
        'Salades',
        'Frites maison',
        'Boissons',
        'Desserts',
        'Formules',
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

  for (const item of items) {
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
      const { error: upErr } = await sb.from('menus').update(base).eq('id', existingId);
      if (upErr) {
        console.error('❌ Update failed for', item.category, item.nom, upErr.message);
      } else {
        updated += 1;
      }
    } else {
      const { error: insErr } = await sb.from('menus').insert([base]);
      if (insErr) {
        console.error('❌ Insert failed for', item.category, item.nom, insErr.message);
      } else {
        inserted += 1;
      }
    }
  }

  console.log('✅ Seed Deliss’King terminé:', {
    restaurantId,
    categoriesCreated,
    inserted,
    updated,
    totalPlanned: items.length,
  });
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});



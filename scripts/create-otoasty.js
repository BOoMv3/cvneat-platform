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
    envFile.split(/\r?\n/).forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (!SUPABASE_URL && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) SUPABASE_URL = value;
      if (!SUPABASE_SERVICE_KEY && key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value;
    });
  } catch (error) {
    console.error('Impossible de lire .env.local :', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Variables Supabase manquantes.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PARTNER_EMAIL = 'otoasty@cvneat.fr';
const PARTNER_PASSWORD = 'otoastycvneat1114';
const RESTAURANT_NAME = "O'Toasty";

const restaurantInfo = {
  nom: RESTAURANT_NAME,
  description: 'Tacos, burgers et tex-mex gourmands à emporter ou en livraison. Sauce fromagère maison.',
  adresse: '4 rue Nougaron Chevas',
  code_postal: '34190',
  ville: 'Ganges',
  telephone: '09 88 35 78 77',
  email: PARTNER_EMAIL,
  type_cuisine: 'Tacos & Fast Food',
  horaires: {
    Lundi: '11:00-23:00',
    Mardi: '11:00-23:00',
    Mercredi: '11:00-23:00',
    Jeudi: '11:00-23:00',
    Vendredi: '11:00-23:30',
    Samedi: '11:00-23:30',
    Dimanche: '18:00-23:00'
  },
  image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=1600&q=80',
  banner_image: 'https://images.unsplash.com/photo-1515666285250-83d61d4b6b77?auto=format&fit=crop&w=1600&q=80',
  profile_image: 'https://images.unsplash.com/photo-1606755962773-0e7d7c0dff78?auto=format&fit=crop&w=600&q=80',
  logo_image: null,
  status: 'active',
  frais_livraison: 2.5,
  ferme_manuellement: false
};

const tacosMeatOptions = [
  { id: 'poulet', nom: 'Poulet', prix: 0, default: false },
  { id: 'escalope-panee', nom: 'Escalope panée', prix: 0, default: false },
  { id: 'cordon-bleu', nom: 'Cordon bleu', prix: 0, default: false },
  { id: 'viande-hachee', nom: 'Viande hachée', prix: 0, default: false },
  { id: 'kebab', nom: 'Kebab', prix: 0, default: false },
  { id: 'nuggets', nom: 'Nuggets', prix: 0, default: false }
];

const tacosSauceOptions = [
  'Algérienne',
  'Andalouse',
  'Mayonnaise',
  'Blanche',
  'Chilli Thaï',
  'Barbecue',
  'Ketchup',
  'Biggy',
  'Curry',
  'Harissa',
  'Samouraï'
].map((nom) => ({ id: nom.toLowerCase().replace(/[^a-z0-9]+/g, '-'), nom, prix: 0, default: false }));

const tacosSupplements = [
  'Mozzarella',
  'Oignons',
  'Poivrons',
  'Tomates',
  'Lardons',
  'Bacon',
  'Blanc de poulet',
  'Miel'
].map((nom) => ({ nom, prix: 0 }));

const tacosBase = [
  { id: 'frites', nom: 'Frites', prix: 0, removable: false },
  { id: 'sauce-fromagere-maison', nom: 'Sauce fromagère maison', prix: 0, removable: false }
];

const menuItems = [
  {
    nom: 'Tacos à composer (M)',
    category: 'Tacos - À composer',
    description: '1 viande au choix, frites et sauce fromagère maison. 2 sauces au choix.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1606755962773-0e7d7c0dff78?auto=format&fit=crop&w=800&q=80',
    requires_meat_selection: true,
    requires_sauce_selection: true,
    max_meats: 1,
    max_sauces: 2,
    meat_options: tacosMeatOptions,
    sauce_options: tacosSauceOptions,
    supplements: tacosSupplements,
    base_ingredients: tacosBase
  },
  {
    nom: 'Tacos à composer (L)',
    category: 'Tacos - À composer',
    description: '2 viandes au choix, frites et sauce fromagère maison. 2 sauces au choix.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1601925260264-c8462e17f162?auto=format&fit=crop&w=800&q=80',
    requires_meat_selection: true,
    requires_sauce_selection: true,
    max_meats: 2,
    max_sauces: 2,
    meat_options: tacosMeatOptions,
    sauce_options: tacosSauceOptions,
    supplements: tacosSupplements,
    base_ingredients: tacosBase
  },
  {
    nom: 'Tacos à composer (XL)',
    category: 'Tacos - À composer',
    description: '3 viandes au choix, frites et sauce fromagère maison. 2 sauces au choix.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1612874470926-5f84f3530e7f?auto=format&fit=crop&w=800&q=80',
    requires_meat_selection: true,
    requires_sauce_selection: true,
    max_meats: 3,
    max_sauces: 2,
    meat_options: tacosMeatOptions,
    sauce_options: tacosSauceOptions,
    supplements: tacosSupplements,
    base_ingredients: tacosBase
  },
  {
    nom: 'Tacos Signature - Chèvre Miel',
    category: 'Tacos Signature',
    description: 'Poulet, chèvre fondant, miel, frites et sauce fromagère maison.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1612874471097-8c01c0ef1abb?auto=format&fit=crop&w=800&q=80',
    base_ingredients: [
      ...tacosBase,
      { id: 'poulet', nom: 'Poulet', prix: 0, removable: true },
      { id: 'chevre', nom: 'Fromage de chèvre', prix: 0, removable: true },
      { id: 'miel', nom: 'Miel', prix: 0, removable: true }
    ]
  },
  {
    nom: 'Tacos Signature - Mexicain',
    category: 'Tacos Signature',
    description: 'Escalope panée, poulet mariné, olives noires, poivrons, sauce blanche.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1601925260320-608c8d9f2307?auto=format&fit=crop&w=800&q=80',
    base_ingredients: [
      ...tacosBase,
      { id: 'escalope-panee', nom: 'Escalope panée', prix: 0, removable: true },
      { id: 'poulet-marinee', nom: 'Poulet mariné', prix: 0, removable: true },
      { id: 'olives-noires', nom: 'Olives noires', prix: 0, removable: true },
      { id: 'poivrons', nom: 'Poivrons', prix: 0, removable: true },
      { id: 'sauce-blanche', nom: 'Sauce blanche', prix: 0, removable: true }
    ]
  },
  {
    nom: 'Tacos Signature - Montagnard',
    category: 'Tacos Signature',
    description: 'Jambon, oignons frits, fromage raclette, frites et sauce fromagère maison.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    base_ingredients: [
      ...tacosBase,
      { id: 'jambon', nom: 'Jambon', prix: 0, removable: true },
      { id: 'oignons-frits', nom: 'Oignons frits', prix: 0, removable: true },
      { id: 'fromage-raclette', nom: 'Fromage à raclette', prix: 0, removable: true }
    ]
  },
  {
    nom: 'Burger BigM',
    category: 'Burgers',
    description: 'Steak, cheddar, crudités, sauce du chef.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: 'Burger Power',
    category: 'Burgers',
    description: 'Double steak, cheddar fondant, crudités fraîches.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: 'Burger Country',
    category: 'Burgers',
    description: 'Galette de pomme de terre croustillante, poulet croustillant, cheddar, crudités.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1606755962773-0e7d7c0dff78?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: 'Compose ton burger',
    category: 'Burgers',
    description: 'Base steak + crudités, assemble ton burger à la demande.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: 'Menu Enfant',
    category: 'Menus',
    description: 'Cheese burger ou 4 nuggets + frite + Capri-Sun ou eau + surprise.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1601924968438-3116c3cc22e4?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: 'Menu Étudiant',
    category: 'Menus',
    description: 'Tacos 1 viande + boisson au choix (offre étudiante).',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1601925260382-df7c9103d31d?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: 'Tex-Mex Nuggets x6',
    category: 'Tex-Mex',
    description: '6 nuggets croustillants à partager.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: 'Tex-Mex Tenders x4',
    category: 'Tex-Mex',
    description: '4 tenders de poulet pané.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1625938145722-6489e5e02294?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: 'Tex-Mex Wings x4',
    category: 'Tex-Mex',
    description: 'Ailes de poulet marinées et croustillantes.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1608032362493-259c0e8a2c5b?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: 'Tex-Mex Onion Rings x4',
    category: 'Tex-Mex',
    description: 'Onion rings dorées et fondantes.',
    prix: null,
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1604908177266-79ea6b685fb0?auto=format&fit=crop&w=800&q=80'
  }
];

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Erreur listUsers : ${error.message}`);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function ensureAuthUser() {
  const existing = await findAuthUserByEmail(PARTNER_EMAIL);
  if (existing) {
    console.log(`Utilisateur Auth déjà présent pour ${PARTNER_EMAIL}`);
    return existing.id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: PARTNER_EMAIL,
    password: PARTNER_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'restaurant' }
  });

  if (error) {
    throw new Error(`Erreur création Auth : ${error.message}`);
  }

  console.log(`✅ Utilisateur Auth créé : ${PARTNER_EMAIL}`);
  return data.user.id;
}

async function upsertUserRecord(userId) {
  const { error } = await supabaseAdmin
    .from('users')
    .upsert({
      id: userId,
      email: PARTNER_EMAIL,
      role: 'restaurant',
      nom: 'O\'Toasty',
      prenom: '',
      telephone: restaurantInfo.telephone,
      adresse: restaurantInfo.adresse,
      code_postal: restaurantInfo.code_postal,
      ville: restaurantInfo.ville,
      points_fidelite: 0,
      historique_points: []
    }, { onConflict: 'id' });

  if (error) {
    throw new Error(`Erreur upsert users : ${error.message}`);
  }
}

async function upsertRestaurant(userId) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('nom', RESTAURANT_NAME)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Erreur vérification restaurant : ${fetchError.message}`);
  }

  const payload = {
    ...restaurantInfo,
    user_id: userId
  };

  if (existing) {
    const { error } = await supabaseAdmin
      .from('restaurants')
      .update(payload)
      .eq('id', existing.id);

    if (error) {
      throw new Error(`Erreur mise à jour restaurant : ${error.message}`);
    }
    console.log(`✅ Restaurant mis à jour (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erreur création restaurant : ${error.message}`);
  }

  console.log(`✅ Restaurant créé (${data.id})`);
  return data.id;
}

async function resetMenus(restaurantId) {
  const { error } = await supabaseAdmin
    .from('menus')
    .delete()
    .eq('restaurant_id', restaurantId);

  if (error) {
    throw new Error(`Erreur nettoyage menus : ${error.message}`);
  }
}

async function insertMenus(restaurantId) {
  const records = menuItems.map((item, index) => ({
    restaurant_id: restaurantId,
    nom: item.nom,
    description: item.description,
    prix: item.prix ?? 0,
    image_url: item.image_url,
    disponible: item.disponible ?? true,
    category: item.category,
    is_drink: false,
    drink_price_small: null,
    drink_price_medium: null,
    drink_price_large: null,
    supplements: item.supplements ?? [],
    meat_options: item.meat_options ?? [],
    sauce_options: item.sauce_options ?? [],
    base_ingredients: item.base_ingredients ?? [],
    requires_meat_selection: item.requires_meat_selection ?? false,
    requires_sauce_selection: item.requires_sauce_selection ?? false,
    max_meats: item.max_meats ?? null,
    max_sauces: item.max_sauces ?? null
  }));

  const { error } = await supabaseAdmin
    .from('menus')
    .insert(records);

  if (error) {
    throw new Error(`Erreur insertion menus : ${error.message}`);
  }

  console.log(`✅ ${records.length} menus insérés`);
}

async function main() {
  try {
    const userId = await ensureAuthUser();
    await upsertUserRecord(userId);
    const restaurantId = await upsertRestaurant(userId);
    await resetMenus(restaurantId);
    await insertMenus(restaurantId);
    console.log('🎉 O\'Toasty configuré avec succès');
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
}

main();


/**
 * Script pour ajouter / mettre à jour le menu du restaurant "La Bonne Pâte"
 * Restaurant ID: 4c31c4b7-799c-4d62-9225-2090bed7cca8
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Chargement des variables d'environnement
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
  console.error('❌ Variables d\'environnement manquantes pour Supabase.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Restaurant La Bonne Pate - ID actif (créé le 07/11/2025)
const RESTAURANT_ID = 'd6725fe6-59ec-413a-b39b-ddb960824999';

const slugify = (value) =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const imageMap = {
  // Pizzas base tomate
  Margherita: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  Reine: 'https://images.unsplash.com/photo-1601925260365-812f9ac6e8c7?auto=format&fit=crop&w=800&q=80',
  Paysanne: 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=800&q=80',
  Chorizo: 'https://images.unsplash.com/photo-1612874471097-8c01c0ef1abb?auto=format&fit=crop&w=800&q=80',
  Bolo: 'https://images.unsplash.com/photo-1585238341986-44ef2b0b3d01?auto=format&fit=crop&w=800&q=80',
  Calzone: 'https://images.unsplash.com/photo-1603079842349-19b0ac2bf39b?auto=format&fit=crop&w=800&q=80',
  'Végétarienne': 'https://images.unsplash.com/photo-1545060894-1bf03c1a1e5a?auto=format&fit=crop&w=800&q=80',
  Coppa: 'https://images.unsplash.com/photo-1628840042765-356cda07504d?auto=format&fit=crop&w=800&q=80',
  // Pizzas base crème
  'Flambée': 'https://images.unsplash.com/photo-1603079842378-9a7b6042f68d?auto=format&fit=crop&w=800&q=80',
  Chevrette: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  'Fromagère': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
  Tartiflette: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  Tartufata: 'https://images.unsplash.com/photo-1612874471097-8c01c0ef1abb?auto=format&fit=crop&w=800&q=80',
  Mortadella: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a48?auto=format&fit=crop&w=800&q=80',
  // Puccias
  'La Puccia italienne': 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=800&q=80',
  'La Puccia végétarienne': 'https://images.unsplash.com/photo-1481931098730-318b6f776db0?auto=format&fit=crop&w=800&q=80',
  'La Puccia Tartufata': 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
  'La Puccia Mortadella': 'https://images.unsplash.com/photo-1453831210728-695502f9f795?auto=format&fit=crop&w=800&q=80',
  'La Puccia Coppa': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  'La Puccia Classique': 'https://images.unsplash.com/photo-1562967916-eb82221dfb36?auto=format&fit=crop&w=800&q=80',
  'La Puccia Cévenole': 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80',
  // Desserts
  'Dessert du moment': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  'Pizzetta Nocciolata': 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=800&q=80',
  // Boissons
  'Coca': 'https://i.ibb.co/233kmw1W/add61152e73b.png',
  'Ice-tea': 'https://i.ibb.co/y7hqJs3/ec23359c1343.png',
  'Coca Zéro': 'https://i.ibb.co/0Rzfkxv7/281cac2537ed.png',
  'Coca Cherry': 'https://i.ibb.co/p6G9qY2q/0b330aa71c23.png',
  'Orangina': 'https://i.ibb.co/KQ1CCZj/e1df76135904.png',
  'Tropico': 'https://i.ibb.co/nNTS8kBS/2711b66c70e6.png',
  'Schweppes Agrumes': 'https://i.ibb.co/Qjtvsp2t/834e3bff6c49.png',
  'Oasis Tropical': 'https://i.ibb.co/x8JC301z/ebf2917c6d24.png',
  'Oasis Pomme Cassis Framboise': 'https://i.ibb.co/Ps65skLQ/4813f00c23f7.png',
  'Fanta Orange': 'https://i.ibb.co/pjkB7rTw/0776741cd1d3.png',
  'Fanta Citron': 'https://i.ibb.co/SDq8xj9y/72b2a7fa921d.png',
  'Hawaï': 'https://i.ibb.co/fd2GTWtn/21baa84755fa.png',
  '7up': 'https://i.ibb.co/w3yS8m2/0471ce6bc234.png',
  '7up Mojitos': 'https://i.ibb.co/4wSyyfGM/3b3489ddf2cf.png',
  'Perrier': 'https://i.ibb.co/ccKS24B4/1479b4930f41.png',
  "Petite Bouteille d'eau": 'https://i.ibb.co/93bg7VBy/9158e27ce41d.png',
  'Saint Pellegrino': 'https://i.ibb.co/LX2fWhjv/14cc707e82a7.png',
  'Bouteille de Coca': 'https://i.ibb.co/F4Xjc5bD/1ec794e1d45b.png',
  'Red Bull': 'https://i.ibb.co/Xr1wNYCF/6a02174f0996.png',
  "Grande Bouteille d'Eau": null,
};

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
  { name: 'Huile d\'olive', type: 'other' },
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
  { name: 'Crème truffée', type: 'other' },
  { name: 'Cerneaux de noix', type: 'other' }
];

// Supprimer les doublons éventuels
const supplements = Array.from(
  ingredientMeta.reduce((map, ingredient) => {
    const key = slugify(ingredient.name);
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        nom: ingredient.name,
        prix: ingredient.type === 'meat' ? 2 : ingredient.type === 'cheese' ? 1 : 1,
      });
    }
    return map;
  }, new Map())
).map(([, value]) => value);

const buildBaseIngredients = (names = []) =>
  names.map((name) => ({
    id: slugify(name),
    nom: name,
    removable: true,
  }));

const pizzasBaseTomate = [
  {
    nom: 'Margherita',
    prix: 10,
    category: 'Pizzas - Base tomate',
    description: 'Mozzarella Fior Di Latte, pesto de basilic',
    baseIngredients: ['Base tomate', 'Mozzarella Fior Di Latte', 'Pesto de basilic'],
    order: 1,
  },
  {
    nom: 'Reine',
    prix: 13,
    category: 'Pizzas - Base tomate',
    description: 'Mozzarella Fior Di Latte, jambon blanc, champignons shiitaké',
    baseIngredients: ['Base tomate', 'Mozzarella Fior Di Latte', 'Jambon blanc', 'Champignons shiitaké'],
    order: 2,
  },
  {
    nom: 'Paysanne',
    prix: 13,
    category: 'Pizzas - Base tomate',
    description: 'Mozzarella Fior Di Latte, jambon cru, oignons, Parmigiano, crème de balsamique',
    baseIngredients: ['Base tomate', 'Mozzarella Fior Di Latte', 'Jambon cru', 'Oignons', 'Parmigiano', 'Crème de balsamique'],
    order: 3,
  },
  {
    nom: 'Chorizo',
    prix: 13,
    category: 'Pizzas - Base tomate',
    description: 'Mozzarella Fior Di Latte, chorizo, oignons, Parmigiano',
    baseIngredients: ['Base tomate', 'Mozzarella Fior Di Latte', 'Chorizo', 'Oignons', 'Parmigiano'],
    order: 4,
  },
  {
    nom: 'Bolo',
    prix: 14,
    category: 'Pizzas - Base tomate',
    description: 'Mozzarella Fior Di Latte, viande hachée de boeuf, oignons rouges',
    baseIngredients: ['Base tomate', 'Mozzarella Fior Di Latte', 'Viande hachée de boeuf', 'Oignons rouges'],
    order: 5,
  },
  {
    nom: 'Calzone',
    prix: 12,
    category: 'Pizzas - Base tomate',
    description: 'Mozzarella Fior Di Latte, jambon blanc, œuf',
    baseIngredients: ['Base tomate', 'Mozzarella Fior Di Latte', 'Jambon blanc', 'Œuf'],
    order: 6,
  },
  {
    nom: 'Végétarienne',
    prix: 16,
    category: 'Pizzas - Base tomate',
    description: 'Mozzarella Fior Di Latte, oignons, champignons shiitaké, roquette, tomates confites, Parmigiano, Burrata, crème de balsamique',
    baseIngredients: ['Base tomate', 'Mozzarella Fior Di Latte', 'Oignons', 'Champignons shiitaké', 'Roquette', 'Tomates confites', 'Parmigiano', 'Burrata', 'Crème de balsamique'],
    order: 7,
  },
  {
    nom: 'Coppa',
    prix: 18,
    category: 'Pizzas - Base tomate',
    description: 'Mozzarella Fior Di Latte, coppa, roquette, Parmigiano, cerneaux de noix, Burrata, crème de balsamique',
    baseIngredients: ['Base tomate', 'Mozzarella Fior Di Latte', 'Coppa', 'Roquette', 'Parmigiano', 'Cerneaux de noix', 'Burrata', 'Crème de balsamique'],
    order: 8,
  },
];

const pizzasBaseCreme = [
  {
    nom: 'Flambée',
    prix: 12,
    category: 'Pizzas - Base crème',
    description: 'Mozzarella Fior Di Latte, lard fumé, oignons',
    baseIngredients: ['Base crème', 'Mozzarella Fior Di Latte', 'Lard fumé', 'Oignons'],
    order: 1,
  },
  {
    nom: 'Chevrette',
    prix: 14,
    category: 'Pizzas - Base crème',
    description: 'Mozzarella Fior Di Latte, Pélardon, oignons, miel',
    baseIngredients: ['Base crème', 'Mozzarella Fior Di Latte', 'Pélardon', 'Oignons', 'Miel'],
    order: 2,
  },
  {
    nom: 'Fromagère',
    prix: 13,
    category: 'Pizzas - Base crème',
    description: 'Mozzarella Fior Di Latte, Taleggio, Gorgonzola, Parmigiano',
    baseIngredients: ['Base crème', 'Mozzarella Fior Di Latte', 'Taleggio', 'Gorgonzola', 'Parmigiano'],
    order: 3,
  },
  {
    nom: 'Tartiflette',
    prix: 14,
    category: 'Pizzas - Base crème',
    description: 'Mozzarella Fior Di Latte, lard fumé, pommes de terre, Reblochon',
    baseIngredients: ['Base crème', 'Mozzarella Fior Di Latte', 'Lard fumé', 'Pommes de terre', 'Reblochon'],
    order: 4,
  },
  {
    nom: 'Tartufata',
    prix: 18,
    category: 'Pizzas - Base crème',
    description: 'Crème truffée, Mozzarella Fior Di Latte, jambon blanc truffé, Stracciatella à la truffe, pesto de basilic',
    baseIngredients: ['Crème truffée', 'Mozzarella Fior Di Latte', 'Jambon blanc truffé', 'Stracciatella à la truffe', 'Pesto de basilic'],
    order: 5,
  },
  {
    nom: 'Mortadella',
    prix: 18,
    category: 'Pizzas - Base crème',
    description: 'Mozzarella Fior Di Latte, mortadelle, pesto de basilic, éclats de pistache, roquette, Burrata',
    baseIngredients: ['Base crème', 'Mozzarella Fior Di Latte', 'Mortadella', 'Pesto de basilic', 'Éclats de pistache', 'Roquette', 'Burrata'],
    order: 6,
  },
];

const puccias = [
  {
    nom: 'La Puccia italienne',
    prix: 10,
    category: 'Puccias',
    description: 'Pesto de basilic, Parmigiano, jambon de Parme, roquette, tomates confites, Burrata',
    baseIngredients: ['Pesto de basilic', 'Parmigiano', 'Jambon cru', 'Roquette', 'Tomates confites', 'Burrata'],
    order: 1,
  },
  {
    nom: 'La Puccia végétarienne',
    prix: 10,
    category: 'Puccias',
    description: 'Pesto de basilic, tomates confites, roquette, oignons rouges, Taleggio, Burrata, crème de balsamique',
    baseIngredients: ['Pesto de basilic', 'Tomates confites', 'Roquette', 'Oignons rouges', 'Taleggio', 'Burrata', 'Crème de balsamique'],
    order: 2,
  },
  {
    nom: 'La Puccia Tartufata',
    prix: 12,
    category: 'Puccias',
    description: 'Crème de truffe, jambon blanc truffé, roquette, pesto de basilic, Burrata',
    baseIngredients: ['Crème de truffe', 'Jambon blanc truffé', 'Roquette', 'Pesto de basilic', 'Burrata'],
    order: 3,
  },
  {
    nom: 'La Puccia Mortadella',
    prix: 10,
    category: 'Puccias',
    description: 'Pesto de basilic, mortadelle, roquette, Parmigiano, Burrata',
    baseIngredients: ['Pesto de basilic', 'Mortadella', 'Roquette', 'Parmigiano', 'Burrata'],
    order: 4,
  },
  {
    nom: 'La Puccia Coppa',
    prix: 10,
    category: 'Puccias',
    description: 'Huile d\'olive, roquette, coppa, Parmigiano, Taleggio, crème de balsamique',
    baseIngredients: ['Huile d\'olive', 'Roquette', 'Coppa', 'Parmigiano', 'Taleggio', 'Crème de balsamique'],
    order: 5,
  },
  {
    nom: 'La Puccia Classique',
    prix: 10,
    category: 'Puccias',
    description: 'Base tomate, mozzarella Fior Di Latte, Taleggio, steak de boeuf 150g, oignons, roquette',
    baseIngredients: ['Base tomate', 'Mozzarella Fior Di Latte', 'Taleggio', 'Steak de boeuf 150g', 'Oignons', 'Roquette'],
    order: 6,
  },
  {
    nom: 'La Puccia Cévenole',
    prix: 10,
    category: 'Puccias',
    description: 'Base crème, mozzarella Fior Di Latte, steak de boeuf 150g, oignons, Pélardon, miel',
    baseIngredients: ['Base crème', 'Mozzarella Fior Di Latte', 'Steak de boeuf 150g', 'Oignons', 'Pélardon', 'Miel'],
    order: 7,
  },
];

const desserts = [
  {
    nom: 'Dessert du moment',
    prix: 4,
    category: 'Desserts',
    description: 'Selon l\'inspiration du chef',
    baseIngredients: [],
    supplements: [],
    order: 1,
  },
  {
    nom: 'Pizzetta Nocciolata',
    prix: 7,
    category: 'Desserts',
    description: 'Pizzetta à la pâte à tartiner noisette, éclats de pistache',
    baseIngredients: ['Éclats de pistache'],
    supplements: [],
    order: 2,
  },
];

const menuItems = [
  ...pizzasBaseTomate.map((item) => ({ ...item, includeSupplements: true })),
  ...pizzasBaseCreme.map((item) => ({ ...item, includeSupplements: true })),
  ...puccias.map((item) => ({ ...item, includeSupplements: true })),
  ...desserts,
  { nom: 'Coca', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Ice-tea', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Coca Zéro', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Coca Cherry', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Orangina', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Tropico', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Schweppes Agrumes', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Oasis Tropical', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Oasis Pomme Cassis Framboise', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Fanta Orange', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Fanta Citron', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Hawaï', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: '7up', prix: 2.4, category: 'Boissons', description: 'Soda', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: '7up Mojitos', prix: 2.4, category: 'Boissons', description: 'Soda (sans alcool)', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: 'Perrier', prix: 2.4, category: 'Boissons', description: 'Eau pétillante', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '33cl' },
  { nom: "Petite Bouteille d'eau", prix: 1.8, category: 'Boissons', description: 'Eau', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '50cl' },
  { nom: 'Saint Pellegrino', prix: 3, category: 'Boissons', description: 'Eau pétillante', baseIngredients: [], includeSupplements: false, isDrink: true },
  { nom: 'Bouteille de Coca', prix: 4.8, category: 'Boissons', description: '', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '1.25L' },
  { nom: 'Red Bull', prix: 3, category: 'Boissons', description: 'Boisson Énergisante', baseIngredients: [], includeSupplements: false, isDrink: true },
  { nom: "Grande Bouteille d'Eau", prix: 2.4, category: 'Boissons', description: 'Eau', baseIngredients: [], includeSupplements: false, isDrink: true, drinkSize: '1.5L' }
];

async function upsertMenuItem(item) {
  const payload = {
    restaurant_id: RESTAURANT_ID,
    nom: item.nom,
    description: item.description,
    prix: item.prix,
    category: item.category,
    disponible: true,
    base_ingredients: buildBaseIngredients(item.baseIngredients),
    supplements: item.includeSupplements ? supplements : item.supplements || [],
    image_url: imageMap[item.nom] || null,
    is_drink: item.isDrink ?? false,
    drink_size: item.drinkSize ?? null,
  };

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('menus')
    .select('id')
    .eq('restaurant_id', RESTAURANT_ID)
    .ilike('nom', item.nom)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Erreur lors de la vérification de ${item.nom}: ${fetchError.message}`);
  }

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from('menus')
      .update(payload)
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Erreur mise à jour ${item.nom}: ${updateError.message}`);
    }
    console.log(`🔄 ${item.nom} mis à jour`);
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('menus')
      .insert([payload]);

    if (insertError) {
      throw new Error(`Erreur insertion ${item.nom}: ${insertError.message}`);
    }
    console.log(`✅ ${item.nom} ajouté`);
  }
}

async function main() {
  try {
    console.log('🚀 Ajout/Mise à jour du menu La Bonne Pâte\n');

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .eq('id', RESTAURANT_ID)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      console.error('❌ Restaurant introuvable avec l\'ID fourni:', RESTAURANT_ID);
      process.exit(1);
    }

    console.log(`📍 Restaurant: ${restaurant.nom} (${restaurant.id})`);

    for (const item of menuItems) {
      await upsertMenuItem(item);
    }

    console.log('\n✨ Menu La Bonne Pâte mis à jour avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du menu :', error.message ?? error);
    process.exit(1);
  }
}

main();


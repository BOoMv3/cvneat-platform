import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '..', '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  try {
    const envRaw = readFileSync(envPath, 'utf8');
    envRaw.split(/\r?\n/).forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...rest] = line.split('=');
      if (!key || rest.length === 0) return;
      const value = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (!SUPABASE_URL && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) SUPABASE_URL = value;
      if (!SUPABASE_SERVICE_KEY && key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value;
    });
  } catch (error) {
    console.error('Impossible de charger .env.local:', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Variables Supabase manquantes.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const normalizeName = (value = '') =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const normalizeToken = (value = '') =>
  value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const extractKeywords = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => extractKeywords(item)).filter(Boolean);
  if (typeof value === 'object') return Object.values(value).flatMap(extractKeywords).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractKeywords(parsed);
      } catch {
        // ignore
      }
    }
    return trimmed
      .split(/[,;\/|&]| et |\n|\r|\t/gi)
      .map((token) => normalizeToken(token))
      .filter(Boolean);
  }
  return [normalizeToken(value)];
};

const getCategoryTokensForRestaurant = (restaurant = {}) => {
  const sources = [
    restaurant.cuisine_type,
    restaurant.type_cuisine,
    restaurant.categories,
    restaurant.category,
    restaurant.categorie,
    restaurant.type,
    restaurant.tags,
    restaurant.keywords,
    restaurant.specialites,
    restaurant.specialities,
    restaurant.description,
  ];
  const tokens = sources.flatMap(extractKeywords).filter(Boolean);
  return Array.from(new Set(tokens.map(normalizeToken))).filter(Boolean);
};

const run = async () => {
  const { data, error } = await supabase.from('restaurants').select('*, frais_livraison');
  if (error) {
    console.error('Erreur chargement restaurants:', error);
    process.exit(1);
  }

  const normalizedRestaurants = data
    .filter((restaurant) => {
      const normalized = normalizeName(restaurant.nom);
      return normalized && normalized !== '.';
    })
    .map((restaurant) => ({
      ...restaurant,
      category_tokens: getCategoryTokensForRestaurant(restaurant),
    }));

  const filtered = normalizedRestaurants.filter((restaurant) => {
    if (restaurant.is_active === false || restaurant.active === false || restaurant.status === 'inactive') {
      return false;
    }
    if (restaurant.ferme_definitivement) {
      return false;
    }
    return true;
  });

  const seen = new Set();
  const unique = filtered.filter((restaurant) => {
    const key = normalizeName(restaurant.nom) || restaurant.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const boostOrder = (restaurant) => {
    const normalized = normalizeName(restaurant.nom);
    if (normalized.includes('la bonne pate')) return 0;
    if (normalized.includes('eclipse')) return 1;
    return 2;
  };

  const finalList = unique.sort((a, b) => {
    const boostDiff = boostOrder(a) - boostOrder(b);
    if (boostDiff !== 0) return boostDiff;
    return 0;
  });

  console.log('Restaurants affichés:', finalList.map((r) => r.nom));
};

run().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});


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

const RESTAURANT_NAME = "O'Toasty";

const normalize = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const run = async () => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .ilike('nom', RESTAURANT_NAME);

  if (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('Aucun restaurant trouvé.');
    process.exit(0);
  }

  data.forEach((restaurant) => {
    const {
      id,
      nom,
      status,
      active,
      is_active,
      ferme_manuellement,
      ferme_definitivement,
      is_closed,
      mise_en_avant,
      mise_en_avant_fin,
      approved,
      visible,
      is_visible,
      en_ligne,
      en_vitrine,
    } = restaurant;
    console.log({
      id,
      nom,
      status,
      active,
      is_active,
      ferme_manuellement,
      ferme_definitivement,
      is_closed,
      mise_en_avant,
      mise_en_avant_fin,
      approved,
      visible,
      is_visible,
      en_ligne,
      en_vitrine,
    });
  });
};

run().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});


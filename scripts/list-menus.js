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
    const envVars = {};
    envFile.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...rest] = trimmed.split('=');
        if (key && rest.length) {
          envVars[key.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
        }
      }
    });
    SUPABASE_URL = SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
    SUPABASE_SERVICE_KEY = SUPABASE_SERVICE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;
  } catch (error) {
    console.error('Impossible de lire .env.local :', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Variables Supabase manquantes.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const restaurantId = process.argv[2];
  const categoryFilter = process.argv[3];
  if (!restaurantId) {
    console.error('Usage: node scripts/list-menus.js <restaurant_id> [category_contains]');
    process.exit(1);
  }

  let query = supabaseAdmin
    .from('menus')
    .select('*')
    .eq('restaurant_id', restaurantId);

  if (categoryFilter) {
    query = query.ilike('category', `%${categoryFilter}%`);
  }

  const { data, error } = await query.order('created_at');

  if (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

main();


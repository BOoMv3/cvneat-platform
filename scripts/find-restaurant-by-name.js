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
  const search = process.argv[2] || '';
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom, status, created_at')
    .ilike('nom', `%${search}%`)
    .order('nom');

  if (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }

  console.log('Résultats pour', search || '(tous)');
  console.table(data || []);
  process.exit(0);
}

main();


import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '..', '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
let SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  try {
    const envRaw = readFileSync(envPath, 'utf8');
    envRaw.split(/\r?\n/).forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...rest] = line.split('=');
      if (!key || rest.length === 0) return;
      const value = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (!SUPABASE_URL && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) SUPABASE_URL = value;
      if (!SUPABASE_ANON_KEY && key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') SUPABASE_ANON_KEY = value;
    });
  } catch (error) {
    console.error('Impossible de charger .env.local:', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Variables Supabase publiques manquantes.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const run = async () => {
  const { data, error } = await supabase.from('restaurants').select('id, nom, status');
  if (error) {
    console.error('Erreur (anon):', error);
    process.exit(1);
  }

  console.log('Restaurants accessibles (anon):', data.map((r) => r.nom));
};

run().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});


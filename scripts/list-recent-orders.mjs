import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (!key) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {}
}

loadEnvFile(resolve(process.cwd(), '.env'));
loadEnvFile(resolve(process.cwd(), '.env.local'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from('commandes')
    .select('id, user_id, restaurant_id, adresse_livraison, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching commandes:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No commandes found.');
    return;
  }

  console.log('Recent commandes (id, user_id, adresse_livraison):');
  data.forEach((order) => {
    console.log(order);
  });
}

main().then(() => process.exit(0));


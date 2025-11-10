import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if ((!SUPABASE_URL || !SUPABASE_SERVICE_KEY) && existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((lineRaw) => {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (!key || valueParts.length === 0) return;
    const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!SUPABASE_URL && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) SUPABASE_URL = value;
    if (!SUPABASE_SERVICE_KEY && key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value;
  });
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables Supabase manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const search = process.argv[2];

if (!search) {
  console.error('Usage: node scripts/get-restaurant.js <nom-ou-email>');
  process.exit(1);
}

async function main() {
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom, email, ville')
    .or(`nom.ilike.%${search}%,email.ilike.%${search}%`)
    .limit(20);

  if (error) {
    console.error('❌ Erreur requête:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('Aucun restaurant trouvé.');
    return;
  }

  data.forEach((resto) => {
    console.log(`${resto.nom} (${resto.id}) - ${resto.email || 'email inconnu'} - ${resto.ville || 'ville inconnue'}`);
  });
}

main();


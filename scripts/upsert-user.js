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
    envFile.split('\n').forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !SUPABASE_URL) SUPABASE_URL = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = value;
    });
  } catch (error) {
    console.error('Impossible de lire .env.local :', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Variables Supabase manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const userId = process.argv[2];
  const email = process.argv[3];
  const role = process.argv[4] || 'user';

  if (!userId || !email) {
    console.error('Usage: node scripts/upsert-user.js <userId> <email> [role]');
    process.exit(1);
  }

  const payload = {
    id: userId,
    email: email.toLowerCase(),
    role,
    nom: 'Admin',
    prenom: '',
    telephone: '0000000000',
    adresse: 'Adresse à définir',
    code_postal: '00000',
    ville: 'Ville',
    points_fidelite: 0,
    historique_points: []
  };

  const { error } = await supabaseAdmin
    .from('users')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Erreur lors de l\'upsert :', error.message);
    process.exit(1);
  }

  console.log(`Utilisateur upsert avec succès : ${email} (${role})`);
}

main();


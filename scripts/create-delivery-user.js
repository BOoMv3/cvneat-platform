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

async function createDeliveryAccount(email, password, nom = 'Livreur', prenom = '', telephone = '0000000000', ville = '', adresse = '') {
  const normalizedEmail = email.toLowerCase().trim();

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'delivery'
    }
  });

  if (authError) {
    throw new Error(`Erreur création Auth pour ${email} : ${authError.message}`);
  }

  const userId = authUser.user.id;

  const { error: upsertError } = await supabaseAdmin
    .from('users')
    .upsert({
      id: userId,
      email: normalizedEmail,
      role: 'delivery',
      nom,
      prenom,
      telephone: telephone || '0000000000',
      adresse: adresse || 'Adresse à préciser',
      code_postal: '00000',
      ville: ville || 'Ville',
      points_fidelite: 0,
      historique_points: []
    }, { onConflict: 'id' });

  if (upsertError) {
    throw new Error(`Erreur upsert users pour ${email} : ${upsertError.message}`);
  }

  console.log(`✅ Compte livreur créé : ${email} (${userId})`);
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error('Usage: node scripts/create-delivery-user.js <email> <password>');
    process.exit(1);
  }

  try {
    await createDeliveryAccount(email, password);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();


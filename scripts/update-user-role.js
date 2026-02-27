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
  const identifier = process.argv[2];
  const newRole = process.argv[3] || 'admin';

  if (!identifier) {
    console.error('Usage: node scripts/update-user-role.js <userId | email> [role]');
    process.exit(1);
  }

  const isEmail = identifier.includes('@');
  const query = isEmail
    ? supabaseAdmin.from('users').select('id, email, role').eq('email', identifier.trim().toLowerCase())
    : supabaseAdmin.from('users').select('id, email, role').eq('id', identifier);

  const { data: existingUser, error: fetchError } = await query.maybeSingle();

  if (fetchError) {
    console.error('Erreur récupération utilisateur :', fetchError.message);
    process.exit(1);
  }

  if (!existingUser) {
    console.error(isEmail ? `Utilisateur introuvable avec cet email: ${identifier}` : 'Utilisateur introuvable avec cet ID.');
    process.exit(1);
  }

  const userId = existingUser.id;

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);

  if (updateError) {
    console.error('Erreur lors de la mise à jour du rôle :', updateError.message);
    process.exit(1);
  }

  console.log(`Rôle mis à jour : ${existingUser.email} → ${newRole}`);
}

main();


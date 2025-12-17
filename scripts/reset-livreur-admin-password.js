#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const email = 'livreuradmin@cvneat.fr';
const newPassword = 'livreuradmin0.';

// Valeurs par défaut (URL Supabase du projet)
const DEFAULT_SUPABASE_URL = 'https://jxbqrvlmvnofaxbtcmsw.supabase.co';

const envPath = join(process.cwd(), '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2]; // Permet de passer la clé en argument

if ((!SUPABASE_SERVICE_KEY) && existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((lineRaw) => {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (!key || valueParts.length === 0) return;
    const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !process.env.NEXT_PUBLIC_SUPABASE_URL) SUPABASE_URL = value;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = value;
  });
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante.');
  console.error('Usage: node scripts/reset-livreur-admin-password.js [SERVICE_ROLE_KEY]');
  console.error('Ou configurez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log(`🔐 Réinitialisation du mot de passe pour ${email}...`);

  // Trouver l'utilisateur
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, nom')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  let authUserId = null;

  if (userData) {
    authUserId = userData.id;
    console.log(`✅ Utilisateur trouvé dans users: ${userData.nom || userData.email} (${userData.id})`);
  } else {
    // Chercher dans auth.users
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      console.error('❌ Erreur listUsers:', listError.message);
      process.exit(1);
    }
    const found = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase().trim());
    if (!found) {
      console.error('❌ Utilisateur introuvable avec cet email.');
      process.exit(1);
    }
    authUserId = found.id;
    console.log(`✅ Utilisateur trouvé dans auth.users: ${found.email} (${found.id})`);
  }

  // Réinitialiser le mot de passe
  const { data: authData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    password: newPassword
  });

  if (updateError) {
    console.error('❌ Erreur lors de la mise à jour du mot de passe:', updateError.message);
    process.exit(1);
  }

  console.log(`✅ Mot de passe réinitialisé avec succès pour ${email}`);
  console.log(`📝 Nouveau mot de passe: ${newPassword}`);
}

main().catch((err) => {
  console.error('❌ Erreur inattendue:', err);
  process.exit(1);
});


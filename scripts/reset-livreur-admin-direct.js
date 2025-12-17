#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const email = 'livreuradmin@cvneat.fr';
const newPassword = 'livreuradmin0.';

// Valeurs par défaut
const DEFAULT_SUPABASE_URL = 'https://jxbqrvlmvnofaxbtcmsw.supabase.co';

const envPath = join(process.cwd(), '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Essayer de lire depuis .env.local
if (!SUPABASE_SERVICE_KEY && existsSync(envPath)) {
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

// Si toujours pas de clé, essayer de la passer en argument
if (!SUPABASE_SERVICE_KEY) {
  SUPABASE_SERVICE_KEY = process.argv[2];
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante.');
  console.error('');
  console.error('Pour obtenir la clé:');
  console.error('1. Allez sur https://supabase.com/dashboard/project/jxbqrvlmvnofaxbtcmsw/settings/api');
  console.error('2. Copiez la "service_role" key (secret)');
  console.error('3. Exécutez: node scripts/reset-livreur-admin-direct.js VOTRE_CLE');
  console.error('');
  console.error('Ou créez un fichier .env.local avec:');
  console.error('SUPABASE_SERVICE_ROLE_KEY=votre_cle_ici');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log(`🔐 Réinitialisation du mot de passe pour ${email}...`);
  console.log('');

  // Trouver l'utilisateur dans la table users
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, nom, prenom')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  let authUserId = null;

  if (userData) {
    authUserId = userData.id;
    console.log(`✅ Utilisateur trouvé dans users:`);
    console.log(`   - Nom: ${userData.prenom || ''} ${userData.nom || ''}`);
    console.log(`   - Email: ${userData.email}`);
    console.log(`   - ID: ${userData.id}`);
  } else {
    console.log('⚠️ Utilisateur non trouvé dans users, recherche dans auth.users...');
    
    // Chercher dans auth.users
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      console.error('❌ Erreur listUsers:', listError.message);
      process.exit(1);
    }
    const found = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase().trim());
    if (!found) {
      console.error('❌ Utilisateur introuvable avec cet email dans auth.users.');
      process.exit(1);
    }
    authUserId = found.id;
    console.log(`✅ Utilisateur trouvé dans auth.users:`);
    console.log(`   - Email: ${found.email}`);
    console.log(`   - ID: ${found.id}`);
  }

  console.log('');
  console.log('🔄 Réinitialisation du mot de passe...');

  // Réinitialiser le mot de passe
  const { data: authData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    password: newPassword
  });

  if (updateError) {
    console.error('❌ Erreur lors de la mise à jour du mot de passe:', updateError.message);
    console.error('   Détails:', updateError);
    process.exit(1);
  }

  console.log('');
  console.log('✅ ✅ ✅ MOT DE PASSE RÉINITIALISÉ AVEC SUCCÈS ✅ ✅ ✅');
  console.log('');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Nouveau mot de passe: ${newPassword}`);
  console.log('');
  console.log('⚠️  IMPORTANT: Communiquez ce mot de passe de manière sécurisée !');
}

main().catch((err) => {
  console.error('❌ Erreur inattendue:', err);
  process.exit(1);
});


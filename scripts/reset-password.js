#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const emailArg = process.argv[2];
const passwordArg = process.argv[3];

if (!emailArg) {
  console.error('Usage: node scripts/reset-password.js <email> [nouveauMotDePasse]');
  process.exit(1);
}

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
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !SUPABASE_URL) SUPABASE_URL = value;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = value;
  });
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Variables Supabase manquantes (URL ou SERVICE ROLE KEY).');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const generateTempPassword = () => {
  const base = Math.random().toString(36).slice(-5);
  const upper = Math.random().toString(36).slice(-5).toUpperCase();
  return `Cvneat-${base}${upper}!`;
};

async function main() {
  const email = emailArg.toLowerCase().trim();
  const newPassword = passwordArg || generateTempPassword();

  const { data: userRecord, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (fetchError) {
    console.error('Erreur récupération utilisateur applicatif :', fetchError.message);
    process.exit(1);
  }

  const userId = userRecord?.id;

  let authUserId = userId;

  if (!authUserId) {
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) {
      console.error('Erreur listUsers :', listError.message);
      process.exit(1);
    }
    const found = listData.users.find((u) => u.email?.toLowerCase() === email);
    if (!found) {
      console.error('Utilisateur Auth introuvable pour cet email.');
      process.exit(1);
    }
    authUserId = found.id;
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    password: newPassword
  });

  if (updateError) {
    console.error('Erreur lors de la mise à jour du mot de passe :', updateError.message);
    process.exit(1);
  }

  console.log(`Mot de passe réinitialisé pour ${email}`);
  console.log(`Nouveau mot de passe : ${newPassword}`);
}

main().catch((err) => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});


#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const oldEmailArg = process.argv[2];
const newEmailArg = process.argv[3];

if (!oldEmailArg || !newEmailArg) {
  console.error('Usage: node scripts/update-partner-email.js <ancienEmail> <nouvelEmail>');
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

async function main() {
  const oldEmail = oldEmailArg.toLowerCase().trim();
  const newEmail = newEmailArg.toLowerCase().trim();

  if (oldEmail === newEmail) {
    console.error('Les emails fourni sont identiques. Rien à faire.');
    process.exit(1);
  }

  const { data: existingNew, error: checkNewError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', newEmail)
    .maybeSingle();

  if (checkNewError) {
    console.error('Erreur vérification nouvel email :', checkNewError.message);
    process.exit(1);
  }

  if (existingNew) {
    console.error('Le nouvel email est déjà utilisé par un autre compte.');
    process.exit(1);
  }

  const { data: userRecord, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('id, email, nom')
    .eq('email', oldEmail)
    .maybeSingle();

  if (fetchError) {
    console.error('Erreur récupération utilisateur :', fetchError.message);
    process.exit(1);
  }

  if (!userRecord) {
    console.error(`Utilisateur introuvable avec l'email ${oldEmail}`);
    process.exit(1);
  }

  console.log(`Utilisateur trouvé : ${userRecord.nom || '(sans nom)'} (${userRecord.id})`);

  console.log('Mise à jour email dans la table users…');
  const { error: updateUserError } = await supabaseAdmin
    .from('users')
    .update({ email: newEmail })
    .eq('id', userRecord.id);

  if (updateUserError) {
    console.error('Erreur mise à jour users :', updateUserError.message);
    process.exit(1);
  }

  console.log('Mise à jour email dans la table restaurants…');
  const { error: updateRestaurantError } = await supabaseAdmin
    .from('restaurants')
    .update({ email: newEmail })
    .eq('user_id', userRecord.id);

  if (updateRestaurantError) {
    console.error('Erreur mise à jour restaurants :', updateRestaurantError.message);
    process.exit(1);
  }

  console.log('Mise à jour email côté Supabase Auth…');
  const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userRecord.id, {
    email: newEmail,
    email_confirm: true
  });

  if (authUpdateError) {
    console.error('Erreur mise à jour Supabase Auth :', authUpdateError.message);
    process.exit(1);
  }

  console.log(`✅ Email mis à jour : ${oldEmail} -> ${newEmail}`);
}

main().catch((err) => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});


#!/usr/bin/env node
/**
 * Crée (ou met à jour) un compte livreur dans Supabase Auth + table public.users
 *
 * Usage:
 *   node scripts/create-delivery-account.js adam@cvneat.fr "motdepasse" "Adam"
 *
 * Requiert:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function die(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const firstName = process.argv[4] || '';

  if (!email || !password) {
    die('Usage: node scripts/create-delivery-account.js <email> <password> [prenom]');
  }

  // Charger .env.local si présent (souvent nécessaire en local)
  try {
    const envLocal = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocal)) {
      dotenv.config({ path: envLocal });
    }
  } catch {
    // ignore
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    die('Variables manquantes: NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabaseAdmin = createClient(url, serviceKey);

  console.log('🔧 Création / mise à jour compte livreur:', email);

  // 1) Trouver l'utilisateur Auth existant (si déjà créé)
  let authUser = null;
  try {
    const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) throw listErr;
    authUser = (listData?.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
  } catch (e) {
    console.warn('⚠️ Impossible de lister les users (non bloquant):', e?.message || e);
  }

  // 2) Créer ou mettre à jour dans Auth
  if (!authUser) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        prenom: firstName,
        nom: '',
        telephone: '',
        role: 'delivery',
      },
    });
    if (error) die(`Erreur createUser: ${error.message}`);
    authUser = data?.user;
    console.log('✅ Auth user créé:', authUser?.id);
  } else {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(authUser.user_metadata || {}),
        prenom: firstName || authUser.user_metadata?.prenom || '',
        role: 'delivery',
      },
    });
    if (error) die(`Erreur updateUserById: ${error.message}`);
    console.log('✅ Auth user mis à jour:', authUser.id);
  }

  if (!authUser?.id) die("Impossible de récupérer l'ID Auth user");

  // 3) Upsert dans public.users
  const nowIso = new Date().toISOString();
  const userRow = {
    id: authUser.id,
    email,
    prenom: firstName || '',
    nom: '',
    telephone: '',
    role: 'delivery',
    adresse: '',
    code_postal: '',
    ville: '',
    updated_at: nowIso,
  };

  // On tente d'abord update, puis insert si absent (pour éviter les erreurs de colonnes non présentes)
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existingErr) {
    die(`Erreur lecture users: ${existingErr.message}`);
  }

  if (existing?.id) {
    const { error: updErr } = await supabaseAdmin.from('users').update(userRow).eq('id', authUser.id);
    if (updErr) die(`Erreur update users: ${updErr.message}`);
    console.log('✅ Ligne users mise à jour');
  } else {
    const { error: insErr } = await supabaseAdmin.from('users').insert({ ...userRow, created_at: nowIso });
    if (insErr) die(`Erreur insert users: ${insErr.message}`);
    console.log('✅ Ligne users créée');
  }

  console.log('🎉 Compte livreur prêt:', email);
}

main().catch((e) => {
  console.error('❌ Erreur script:', e);
  process.exit(1);
});



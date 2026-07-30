#!/usr/bin/env node
/**
 * Crée le compte associé (semi-admin lecture seule) pour Roméo.
 * Usage: node scripts/creer-compte-associe-romeo.mjs
 *
 * Prérequis : migration 20260729140000_associe_role.sql appliquée (role CHECK).
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ Variables Supabase manquantes');
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COMPTE = {
  prenom: 'Roméo',
  nom: 'Associé',
  email: 'romeo@cvneat.fr',
  password: 'RomeoAssocie2026!',
  telephone: '',
};

async function findAuthUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  while (page <= 20) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (hit) return hit;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function main() {
  console.log("=== Création compte associé Roméo (lecture seule) ===\n");

  // Appliquer le CHECK role si possible via RPC raw SQL n'est pas dispo — on tente upsert
  let authUser = await findAuthUserByEmail(COMPTE.email);
  if (!authUser) {
    const { data, error } = await sb.auth.admin.createUser({
      email: COMPTE.email,
      password: COMPTE.password,
      email_confirm: true,
      user_metadata: { role: 'associe', prenom: COMPTE.prenom, nom: COMPTE.nom },
    });
    if (error) throw new Error(`Auth: ${error.message}`);
    authUser = data.user;
    console.log('✅ Compte auth créé');
  } else {
    await sb.auth.admin.updateUserById(authUser.id, {
      password: COMPTE.password,
      email_confirm: true,
      user_metadata: { role: 'associe', prenom: COMPTE.prenom, nom: COMPTE.nom },
    });
    console.log('ℹ️  Auth existant — mot de passe et metadata mis à jour');
  }

  const row = {
    id: authUser.id,
    email: COMPTE.email,
    role: 'associe',
    prenom: COMPTE.prenom,
    nom: COMPTE.nom,
    telephone: COMPTE.telephone || '',
    adresse: '',
    code_postal: '',
    ville: '',
  };

  const { data: existing } = await sb.from('users').select('id, role').eq('id', authUser.id).maybeSingle();
  if (existing) {
    const { error } = await sb.from('users').update(row).eq('id', authUser.id);
    if (error) {
      console.warn('⚠️  Profil users non mis à jour :', error.message);
      console.warn('   → Applique supabase/migrations/20260729140000_associe_role.sql puis relance ce script.');
    } else {
      console.log('✅ Profil users mis à jour (associe)');
    }
  } else {
    const { error } = await sb.from('users').insert(row);
    if (error) {
      console.warn('⚠️  Profil users non créé :', error.message);
      console.warn('   → Applique supabase/migrations/20260729140000_associe_role.sql puis relance ce script.');
    } else {
      console.log('✅ Profil users créé (associe)');
    }
  }

  console.log('\n========== IDENTIFIANTS ASSOCIÉ ROMÉO ==========\n');
  console.log('URL          : https://www.cvneat.fr/admin');
  console.log(`Email        : ${COMPTE.email}`);
  console.log(`Mot de passe : ${COMPTE.password}`);
  console.log('\nMême interface admin — lecture seule (bénéfices inclus, aucune modification).\n');
}

main().catch((e) => {
  console.error('❌', e.message || e);
  process.exit(1);
});

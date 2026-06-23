#!/usr/bin/env node
/**
 * Crée le compte comptable CVN'EAT.
 * Usage: node scripts/creer-compte-comptable.mjs
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
  prenom: 'Comptabilite',
  nom: 'CVNEAT',
  email: 'comptable@cvneat.fr',
  password: 'Comptable2026!Cvneat',
  telephone: '0786014171',
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
  console.log("=== Création compte comptable CVN'EAT ===\n");

  let authUser = await findAuthUserByEmail(COMPTE.email);
  if (!authUser) {
    const { data, error } = await sb.auth.admin.createUser({
      email: COMPTE.email,
      password: COMPTE.password,
      email_confirm: true,
      user_metadata: { role: 'comptable', prenom: COMPTE.prenom, nom: COMPTE.nom },
    });
    if (error) throw new Error(`Auth: ${error.message}`);
    authUser = data.user;
    console.log('✅ Compte auth créé');
  } else {
    await sb.auth.admin.updateUserById(authUser.id, {
      password: COMPTE.password,
      email_confirm: true,
      user_metadata: { role: 'comptable', prenom: COMPTE.prenom, nom: COMPTE.nom },
    });
    console.log('ℹ️  Auth existant — mot de passe et metadata mis à jour');
  }

  const row = {
    id: authUser.id,
    email: COMPTE.email,
    role: 'comptable',
    prenom: COMPTE.prenom,
    nom: COMPTE.nom,
    telephone: COMPTE.telephone,
    adresse: '1 bis Rue Armand Sabatier',
    code_postal: '34190',
    ville: 'Ganges',
  };

  const { data: existing } = await sb.from('users').select('id').eq('id', authUser.id).maybeSingle();
  if (existing) {
    const { error } = await sb.from('users').update(row).eq('id', authUser.id);
    if (error) {
      console.warn('⚠️  Profil users non mis à jour (migration comptable à appliquer) :', error.message);
    } else {
      console.log('✅ Profil users mis à jour (comptable)');
    }
  } else {
    const { error } = await sb.from('users').insert(row);
    if (error) {
      console.warn('⚠️  Profil users non créé (migration comptable à appliquer) :', error.message);
      console.warn('   Le compte fonctionne via metadata auth jusqu’à application de la migration SQL.');
    } else {
      console.log('✅ Profil users créé (comptable)');
    }
  }

  console.log('\n========== IDENTIFIANTS COMPTABLE ==========\n');
  console.log('URL          : https://www.cvneat.fr/comptable');
  console.log(`Email        : ${COMPTE.email}`);
  console.log(`Mot de passe : ${COMPTE.password}`);
  console.log('\n(À transmettre à la comptable — changer le MDP après première connexion si souhaité)\n');
}

main().catch((e) => {
  console.error('❌', e.message || e);
  process.exit(1);
});

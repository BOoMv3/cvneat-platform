#!/usr/bin/env node

/**
 * Script pour créer le restaurant Molokai
 */

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
    envFile.split(/\r?\n/).forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (!SUPABASE_URL && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) SUPABASE_URL = value;
      if (!SUPABASE_SERVICE_KEY && key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value;
    });
  } catch (error) {
    console.error('Impossible de lire .env.local :', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Variables Supabase manquantes.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ⚠️ SÉCURITÉ : Ne jamais mettre les mots de passe en dur dans le code
// Utiliser des variables d'environnement ou des arguments en ligne de commande
const PARTNER_EMAIL = process.env.MOLOKAI_EMAIL || process.argv[2] || 'molokai@cvneat.fr';
const PARTNER_PASSWORD = process.env.MOLOKAI_PASSWORD || process.argv[3] || '';
const RESTAURANT_NAME = 'Molokai';

if (!PARTNER_PASSWORD) {
  console.error('❌ ERREUR SÉCURITÉ: Le mot de passe doit être fourni via:');
  console.error('   - Variable d\'environnement: MOLOKAI_PASSWORD');
  console.error('   - Argument: node scripts/create-molokai.js <email> <password>');
  console.error('\n⚠️  Ne jamais commiter les mots de passe dans le code source!');
  process.exit(1);
}

const restaurantInfo = {
  nom: RESTAURANT_NAME,
  description: 'Restaurant à venir - Menu en cours de configuration',
  adresse: 'Adresse à définir',
  code_postal: '34190',
  ville: 'Ganges',
  telephone: 'À définir',
  email: PARTNER_EMAIL,
  type_cuisine: 'À définir',
  horaires: {
    Lundi: '11:00-23:00',
    Mardi: '11:00-23:00',
    Mercredi: '11:00-23:00',
    Jeudi: '11:00-23:00',
    Vendredi: '11:00-23:00',
    Samedi: '11:00-23:00',
    Dimanche: '11:00-23:00'
  },
  image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
  banner_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
  profile_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
  logo_image: null,
  status: 'active',
  frais_livraison: 2.5,
  ferme_manuellement: false
};

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Erreur listUsers : ${error.message}`);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function ensureAuthUser() {
  const existing = await findAuthUserByEmail(PARTNER_EMAIL);
  if (existing) {
    console.log(`✅ Utilisateur Auth déjà présent pour ${PARTNER_EMAIL}`);
    return existing.id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: PARTNER_EMAIL,
    password: PARTNER_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'restaurant' }
  });

  if (error) {
    throw new Error(`Erreur création Auth : ${error.message}`);
  }

  console.log(`✅ Utilisateur Auth créé : ${PARTNER_EMAIL}`);
  return data.user.id;
}

async function upsertUserRecord(userId) {
  const { error } = await supabaseAdmin
    .from('users')
    .upsert({
      id: userId,
      email: PARTNER_EMAIL,
      role: 'restaurant',
      nom: RESTAURANT_NAME,
      prenom: '',
      telephone: restaurantInfo.telephone,
      adresse: restaurantInfo.adresse,
      code_postal: restaurantInfo.code_postal,
      ville: restaurantInfo.ville,
      points_fidelite: 0,
      historique_points: []
    }, { onConflict: 'id' });

  if (error) {
    throw new Error(`Erreur upsert users : ${error.message}`);
  }
}

async function upsertRestaurant(userId) {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('nom', RESTAURANT_NAME)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Erreur vérification restaurant : ${fetchError.message}`);
  }

  const payload = {
    ...restaurantInfo,
    user_id: userId
  };

  if (existing) {
    const { error } = await supabaseAdmin
      .from('restaurants')
      .update(payload)
      .eq('id', existing.id);

    if (error) {
      throw new Error(`Erreur mise à jour restaurant : ${error.message}`);
    }
    console.log(`✅ Restaurant mis à jour (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur création restaurant : ${error.message}`);
  }

  console.log(`✅ Restaurant créé (${data.id})`);
  return data.id;
}

async function main() {
  try {
    console.log('🚀 Création du restaurant Molokai...\n');

    const userId = await ensureAuthUser();
    await upsertUserRecord(userId);
    const restaurantId = await upsertRestaurant(userId);

    console.log('\n🎉 Molokai configuré avec succès !');
    console.log(`\n📊 Informations:`);
    console.log(`   - Email: ${PARTNER_EMAIL}`);
    console.log(`   - Restaurant ID: ${restaurantId}`);
    console.log(`   - User ID: ${userId}`);
    console.log(`\n💡 Vous pouvez maintenant ajouter le menu !\n`);
    console.log('⚠️  SÉCURITÉ: Le mot de passe a été utilisé pour créer le compte.');
    console.log('   Changez-le immédiatement si ce script a été commité sur GitHub!\n');

  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
}

main();


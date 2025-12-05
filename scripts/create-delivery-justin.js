#!/usr/bin/env node

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
    console.error('Impossible de lire .env.local:', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables Supabase manquantes.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createDeliveryAccount() {
  try {
    console.log('🚴 Création du compte livreur pour Justin...\n');

    const email = 'justin@cvneat.fr';
    const password = 'justincvneat1220';
    const nom = 'Justin';

    // 1. Vérifier si l'utilisateur existe déjà
    console.log('1️⃣ Vérification de l\'utilisateur...');
    let { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.find(u => u.email === email);

    let userId;
    if (userExists) {
      console.log('   ✅ Utilisateur existe déjà:', userExists.id);
      userId = userExists.id;
      
      // Mettre à jour le mot de passe
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: password }
      );
      
      if (updateError) {
        console.warn('   ⚠️ Erreur mise à jour mot de passe:', updateError.message);
      } else {
        console.log('   ✅ Mot de passe mis à jour');
      }
    } else {
      console.log('   📝 Création de l\'utilisateur...');
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          nom: nom,
          prenom: '',
          role: 'delivery'
        }
      });

      if (userError || !newUser) {
        throw new Error(`Erreur création utilisateur: ${userError?.message || 'Inconnu'}`);
      }

      userId = newUser.user.id;
      console.log('   ✅ Utilisateur créé:', userId);
    }

    // 2. Créer ou mettre à jour l'entrée dans la table users
    console.log('\n2️⃣ Création/mise à jour de l\'entrée users...');
    const { data: existingUserData } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingUserData) {
      // Mettre à jour
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          email: email,
          nom: nom,
          role: 'delivery'
        })
        .eq('id', userId);

      if (updateError) {
        console.warn('   ⚠️ Erreur mise à jour users:', updateError.message);
      } else {
        console.log('   ✅ Entrée users mise à jour');
      }
    } else {
      // Créer
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: email,
          nom: nom,
          prenom: '',
          role: 'delivery',
          telephone: '',
          adresse: '',
          code_postal: '',
          ville: ''
        });

      if (insertError) {
        console.warn('   ⚠️ Erreur création entrée users:', insertError.message);
      } else {
        console.log('   ✅ Entrée users créée');
      }
    }

    console.log('\n✅ Compte livreur créé avec succès !');
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 Mot de passe: ${password}`);
    console.log(`👤 Nom: ${nom}`);
    console.log(`🚴 Rôle: delivery`);
    console.log(`🆔 User ID: ${userId}`);
    console.log(`\n✅ Le livreur peut maintenant se connecter et accéder au dashboard livreur !`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createDeliveryAccount();


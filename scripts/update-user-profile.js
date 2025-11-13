#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const emailArg = process.argv[2];
const prenomArg = process.argv[3];
const nomArg = process.argv[4];
const telephoneArg = process.argv[5];

if (!emailArg || !prenomArg || !nomArg || !telephoneArg) {
  console.error('Usage: node scripts/update-user-profile.js <email> <prenom> <nom> <telephone>');
  process.exit(1);
}

// Charger les variables d'environnement
const envPath = join(process.cwd(), '.env.local');
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let DB_HOST = process.env.DB_HOST;
let DB_USER = process.env.DB_USER;
let DB_PASSWORD = process.env.DB_PASSWORD;
let DB_NAME = process.env.DB_NAME;

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((lineRaw) => {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (!key || valueParts.length === 0) return;
    const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !SUPABASE_URL) SUPABASE_URL = value;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = value;
    if (key === 'DB_HOST' && !DB_HOST) DB_HOST = value;
    if (key === 'DB_USER' && !DB_USER) DB_USER = value;
    if (key === 'DB_PASSWORD' && !DB_PASSWORD) DB_PASSWORD = value;
    if (key === 'DB_NAME' && !DB_NAME) DB_NAME = value;
  });
}

async function updateProfileSupabase(email, prenom, nom, telephone) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { success: false, reason: 'Variables Supabase manquantes' };
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Chercher l'utilisateur dans la table users
    const { data: userRecord, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, nom, prenom, telephone')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (fetchError) {
      return { success: false, reason: `Erreur recherche: ${fetchError.message}` };
    }

    if (!userRecord) {
      // Si l'utilisateur n'existe pas dans users, chercher dans auth.users
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (listError) {
        return { success: false, reason: `Erreur listUsers: ${listError.message}` };
      }
      const found = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found) {
        return { success: false, reason: 'Utilisateur non trouvé dans Supabase' };
      }

      // Créer l'utilisateur dans la table users
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: found.id,
          email: email.toLowerCase().trim(),
          nom: nom,
          prenom: prenom,
          telephone: telephone,
          role: 'user',
          adresse: '',
          code_postal: '',
          ville: ''
        })
        .select()
        .single();

      if (createError) {
        return { success: false, reason: `Erreur création: ${createError.message}` };
      }

      return { success: true, system: 'Supabase (créé)', user: newUser };
    }

    // Mettre à jour l'utilisateur existant
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        nom: nom,
        prenom: prenom,
        telephone: telephone
      })
      .eq('id', userRecord.id)
      .select()
      .single();

    if (updateError) {
      return { success: false, reason: `Erreur mise à jour: ${updateError.message}` };
    }

    return { success: true, system: 'Supabase', user: updatedUser };
  } catch (error) {
    return { success: false, reason: `Exception: ${error.message}` };
  }
}

async function updateProfileMySQL(email, prenom, nom, telephone) {
  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    return { success: false, reason: 'Variables MySQL manquantes' };
  }

  try {
    const connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });

    // Vérifier si l'utilisateur existe
    const [users] = await connection.execute(
      'SELECT id, email FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      await connection.end();
      return { success: false, reason: 'Utilisateur non trouvé dans MySQL' };
    }

    // Mettre à jour le profil
    await connection.execute(
      'UPDATE users SET nom = ?, prenom = ?, telephone = ? WHERE email = ?',
      [nom, prenom, telephone, email.toLowerCase().trim()]
    );

    await connection.end();
    return { success: true, system: 'MySQL' };
  } catch (error) {
    return { success: false, reason: `Erreur MySQL: ${error.message}` };
  }
}

async function main() {
  const email = emailArg.toLowerCase().trim();
  const prenom = prenomArg;
  const nom = nomArg;
  const telephone = telephoneArg;

  console.log(`Mise à jour du profil pour ${email}...\n`);
  console.log(`Prénom: ${prenom}`);
  console.log(`Nom: ${nom}`);
  console.log(`Téléphone: ${telephone}\n`);

  // Essayer d'abord Supabase
  console.log('1. Tentative avec Supabase...');
  const supabaseResult = await updateProfileSupabase(email, prenom, nom, telephone);
  
  if (supabaseResult.success) {
    console.log(`✅ Profil mis à jour avec succès dans ${supabaseResult.system}`);
    if (supabaseResult.user) {
      console.log(`\nInformations mises à jour:`);
      console.log(`  Email: ${supabaseResult.user.email}`);
      console.log(`  Prénom: ${supabaseResult.user.prenom}`);
      console.log(`  Nom: ${supabaseResult.user.nom}`);
      console.log(`  Téléphone: ${supabaseResult.user.telephone}`);
    }
    return;
  } else {
    console.log(`   ❌ ${supabaseResult.reason}`);
  }

  // Essayer MySQL
  console.log('\n2. Tentative avec MySQL...');
  const mysqlResult = await updateProfileMySQL(email, prenom, nom, telephone);
  
  if (mysqlResult.success) {
    console.log(`✅ Profil mis à jour avec succès dans ${mysqlResult.system}`);
    return;
  } else {
    console.log(`   ❌ ${mysqlResult.reason}`);
  }

  console.log('\n❌ Échec : Impossible de mettre à jour le profil dans aucun système.');
  console.log('Vérifiez que :');
  console.log('  - L\'utilisateur existe dans la base de données');
  console.log('  - Les variables d\'environnement sont correctement configurées');
  process.exit(1);
}

main().catch((err) => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});


#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const emailArg = process.argv[2];
const passwordArg = process.argv[3];

if (!emailArg || !passwordArg) {
  console.error('Usage: node scripts/update-password.js <email> <nouveauMotDePasse>');
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

async function updatePasswordSupabase(email, newPassword) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { success: false, reason: 'Variables Supabase manquantes' };
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Chercher l'utilisateur dans auth.users d'abord
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    let authUserId = null;
    
    if (!listError && listData) {
      const found = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (found) {
        authUserId = found.id;
      }
    }

    // Si trouvé dans auth, mettre à jour
    if (authUserId) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: newPassword
      });

      if (updateError) {
        return { success: false, reason: `Erreur mise à jour: ${updateError.message}` };
      }

      return { success: true, system: 'Supabase Auth' };
    }

    // Si pas trouvé dans auth, chercher dans la table users
    const { data: userRecord, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (userRecord) {
      // L'utilisateur existe dans users mais pas dans auth.users
      // Créer l'utilisateur dans auth.users
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: newPassword,
        email_confirm: true
      });

      if (createError) {
        return { success: false, reason: `Erreur création auth: ${createError.message}` };
      }

      return { success: true, system: 'Supabase (créé dans Auth)' };
    }

    return { success: false, reason: 'Utilisateur non trouvé dans Supabase' };
  } catch (error) {
    return { success: false, reason: `Exception: ${error.message}` };
  }
}

async function updatePasswordMySQL(email, newPassword) {
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

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await connection.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email.toLowerCase().trim()]
    );

    await connection.end();
    return { success: true, system: 'MySQL' };
  } catch (error) {
    return { success: false, reason: `Erreur MySQL: ${error.message}` };
  }
}

async function main() {
  const email = emailArg.toLowerCase().trim();
  const newPassword = passwordArg;

  console.log(`Tentative de mise à jour du mot de passe pour ${email}...\n`);

  // Essayer d'abord Supabase
  console.log('1. Tentative avec Supabase...');
  const supabaseResult = await updatePasswordSupabase(email, newPassword);
  
  if (supabaseResult.success) {
    console.log(`✅ Mot de passe mis à jour avec succès dans ${supabaseResult.system}`);
    console.log(`Nouveau mot de passe : ${newPassword}`);
    return;
  } else {
    console.log(`   ❌ ${supabaseResult.reason}`);
  }

  // Essayer MySQL
  console.log('\n2. Tentative avec MySQL...');
  const mysqlResult = await updatePasswordMySQL(email, newPassword);
  
  if (mysqlResult.success) {
    console.log(`✅ Mot de passe mis à jour avec succès dans ${mysqlResult.system}`);
    console.log(`Nouveau mot de passe : ${newPassword}`);
    return;
  } else {
    console.log(`   ❌ ${mysqlResult.reason}`);
  }

  console.log('\n❌ Échec : Impossible de mettre à jour le mot de passe dans aucun système.');
  console.log('Vérifiez que :');
  console.log('  - L\'utilisateur existe dans la base de données');
  console.log('  - Les variables d\'environnement sont correctement configurées');
  process.exit(1);
}

main().catch((err) => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});


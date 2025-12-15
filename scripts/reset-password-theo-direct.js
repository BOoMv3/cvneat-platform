/**
 * Script direct pour réinitialiser le mot de passe de theo@cvneat.fr
 * Utilise l'API Supabase Admin directement
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Charger les variables d'environnement depuis .env.local
const envPath = join(process.cwd(), '.env.local');
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !SUPABASE_URL) SUPABASE_URL = value;
        if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = value;
      }
    }
  });
} catch (err) {
  console.warn('⚠️  Impossible de lire .env.local, utilisation des variables d\'environnement système');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables Supabase manquantes.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Générer un mot de passe temporaire sécurisé
function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  // Commencer par une majuscule
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  // Ajouter des caractères aléatoires
  for (let i = 1; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

async function resetPassword() {
  const email = 'theo@cvneat.fr';
  const newPassword = generatePassword();

  try {
    console.log(`🔐 Réinitialisation du mot de passe pour ${email}...\n`);

    // 1. Trouver l'utilisateur dans Supabase Auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', listError);
      process.exit(1);
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error(`❌ Utilisateur ${email} non trouvé dans Supabase Auth.`);
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé: ${user.email} (ID: ${user.id})\n`);

    // 2. Réinitialiser le mot de passe
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Erreur lors de la réinitialisation:', updateError);
      process.exit(1);
    }

    console.log('✅ Mot de passe réinitialisé avec succès !\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Email:', email);
    console.log('🔑 Nouveau mot de passe:', newPassword);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('⚠️  Transmettez ce mot de passe de manière sécurisée à Théo.');
    console.log('💡 Il devra changer ce mot de passe lors de sa prochaine connexion.\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message || error);
    process.exit(1);
  }
}

resetPassword();


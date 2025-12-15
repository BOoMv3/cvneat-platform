/**
 * Script pour réinitialiser le mot de passe de theo@cvneat.fr
 * Génère un nouveau mot de passe temporaire
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Chargement des variables d'environnement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  try {
    const envFile = readFileSync(envPath, 'utf8');
    const envVars = {};
    envFile.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
        }
      }
    });
    SUPABASE_URL = SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
    SUPABASE_SERVICE_KEY = SUPABASE_SERVICE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;
  } catch (err) {
    console.error('⚠️  Impossible de lire .env.local :', err.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes pour Supabase.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Générer un mot de passe aléatoire sécurisé
function generatePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

async function resetPassword() {
  const userEmail = 'theo@cvneat.fr';
  
  try {
    console.log(`🔐 Réinitialisation du mot de passe pour ${userEmail}...\n`);

    // 1. Trouver l'utilisateur par email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', listError);
      process.exit(1);
    }

    const user = users.users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error(`❌ Utilisateur ${userEmail} non trouvé.`);
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé: ${user.email} (ID: ${user.id})\n`);

    // 2. Générer un nouveau mot de passe
    const newPassword = generatePassword(14);
    console.log(`🔑 Nouveau mot de passe généré: ${newPassword}\n`);

    // 3. Réinitialiser le mot de passe
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Erreur lors de la réinitialisation du mot de passe:', updateError);
      process.exit(1);
    }

    console.log('✅ Mot de passe réinitialisé avec succès !\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Email:', userEmail);
    console.log('🔑 Nouveau mot de passe:', newPassword);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('⚠️  IMPORTANT: Transmettez ce mot de passe de manière sécurisée à l\'utilisateur.');
    console.log('💡 L\'utilisateur devra changer ce mot de passe lors de sa prochaine connexion.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message || error);
    process.exit(1);
  }
}

resetPassword();


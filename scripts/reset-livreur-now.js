#!/usr/bin/env node

// Script pour réinitialiser directement le mot de passe via l'API Supabase Admin
import { createClient } from '@supabase/supabase-js';

const email = 'livreuradmin@cvneat.fr';
const newPassword = 'livreuradmin0.';
const SUPABASE_URL = 'https://jxbqrvlmvnofaxbtcmsw.supabase.co';

// Essayer de récupérer la clé depuis plusieurs sources
let SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Si pas dans l'environnement, essayer depuis les arguments
if (!SERVICE_ROLE_KEY) {
  SERVICE_ROLE_KEY = process.argv[2];
}

// Si toujours pas, essayer de lire depuis un fichier .env.local
if (!SERVICE_ROLE_KEY) {
  try {
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const envPath = join(process.cwd(), '.env.local');
    
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach((lineRaw) => {
        const line = lineRaw.trim();
        if (!line || line.startsWith('#')) return;
        const [key, ...valueParts] = line.split('=');
        if (!key || valueParts.length === 0) return;
        const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SERVICE_ROLE_KEY) {
          SERVICE_ROLE_KEY = value;
        }
      });
    }
  } catch (e) {
    // Ignorer les erreurs
  }
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY non trouvée');
  console.error('');
  console.error('Options:');
  console.error('1. Passez la clé en argument: node scripts/reset-livreur-now.js VOTRE_CLE');
  console.error('2. Exportez la variable: export SUPABASE_SERVICE_ROLE_KEY=votre_cle');
  console.error('3. Créez .env.local avec: SUPABASE_SERVICE_ROLE_KEY=votre_cle');
  console.error('');
  console.error('Pour obtenir la clé:');
  console.error('https://supabase.com/dashboard/project/jxbqrvlmvnofaxbtcmsw/settings/api');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log(`🔐 Réinitialisation du mot de passe pour ${email}...`);
  console.log('');
  
  try {
    // Trouver l'utilisateur dans auth.users
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    
    if (listError) {
      console.error('❌ Erreur lors de la recherche:', listError.message);
      process.exit(1);
    }
    
    const user = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error(`❌ Utilisateur ${email} introuvable dans auth.users`);
      process.exit(1);
    }
    
    console.log(`✅ Utilisateur trouvé: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log('');
    console.log('🔄 Réinitialisation du mot de passe...');
    
    // Réinitialiser le mot de passe
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword
    });
    
    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError.message);
      console.error('   Détails:', JSON.stringify(updateError, null, 2));
      process.exit(1);
    }
    
    console.log('');
    console.log('✅ ✅ ✅ MOT DE PASSE RÉINITIALISÉ AVEC SUCCÈS ✅ ✅ ✅');
    console.log('');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Nouveau mot de passe: ${newPassword}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Communiquez ce mot de passe de manière sécurisée !');
    
  } catch (err) {
    console.error('❌ Erreur inattendue:', err.message);
    console.error('   Stack:', err.stack);
    process.exit(1);
  }
}

main();


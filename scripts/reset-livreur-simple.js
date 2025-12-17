#!/usr/bin/env node

// Script simple pour réinitialiser le mot de passe de livreuradmin@cvneat.fr
// Usage: node scripts/reset-livreur-simple.js [SERVICE_ROLE_KEY]

import { createClient } from '@supabase/supabase-js';

const email = 'livreuradmin@cvneat.fr';
const newPassword = 'livreuradmin0.';
const SUPABASE_URL = 'https://jxbqrvlmvnofaxbtcmsw.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY requise');
  console.error('');
  console.error('Pour obtenir la clé:');
  console.error('1. Allez sur: https://supabase.com/dashboard/project/jxbqrvlmvnofaxbtcmsw/settings/api');
  console.error('2. Copiez la "service_role" key (secret)');
  console.error('3. Exécutez: node scripts/reset-livreur-simple.js VOTRE_CLE');
  console.error('');
  console.error('Ou exportez la variable: export SUPABASE_SERVICE_ROLE_KEY=votre_cle');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log(`🔐 Réinitialisation du mot de passe pour ${email}...`);
  
  // Trouver l'utilisateur
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  
  if (listError) {
    console.error('❌ Erreur:', listError.message);
    process.exit(1);
  }
  
  const user = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    console.error(`❌ Utilisateur ${email} introuvable`);
    process.exit(1);
  }
  
  console.log(`✅ Utilisateur trouvé: ${user.email} (${user.id})`);
  
  // Réinitialiser le mot de passe
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword
  });
  
  if (updateError) {
    console.error('❌ Erreur:', updateError.message);
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ ✅ ✅ MOT DE PASSE RÉINITIALISÉ ✅ ✅ ✅');
  console.log('');
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Nouveau mot de passe: ${newPassword}`);
  console.log('');
}

main().catch((err) => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});


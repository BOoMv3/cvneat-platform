#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Charger les variables d'environnement
const envPath = join(process.cwd(), '.env.local');
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  });
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Variables Supabase manquantes (URL ou SERVICE ROLE KEY).');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixDuplicateUser() {
  try {
    const badUserId = 'ba074f5b-af52-44f6-8fd9-bb3aeddc476b';
    const goodUserId = '389895f8-a479-4eb2-aab4-7a4433ddaad8';
    
    console.log('🔍 Mise à jour du compte avec "Utilisateur"...\n');
    
    // Mettre à jour les données du mauvais compte
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        nom: 'Pigot',
        prenom: 'Melany',
        telephone: '0764308038'
      })
      .eq('id', badUserId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError);
      process.exit(1);
    }
    
    if (updatedUser) {
      console.log('✅ Compte mis à jour:');
      console.log(`   ID: ${updatedUser.id}`);
      console.log(`   Nom: ${updatedUser.nom}`);
      console.log(`   Prénom: ${updatedUser.prenom}`);
      console.log(`   Téléphone: ${updatedUser.telephone}`);
    }
    
    console.log('\n✅ Terminé ! Les commandes devraient maintenant afficher "Melany Pigot"');
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    process.exit(1);
  }
}

fixDuplicateUser().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});







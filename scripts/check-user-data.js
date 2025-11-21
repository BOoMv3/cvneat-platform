#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const emailArg = process.argv[2] || 'mel.pig@hotmail.fr';

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

async function checkUserData() {
  try {
    const email = emailArg.toLowerCase().trim();
    console.log(`🔍 Vérification des données pour: ${email}\n`);
    
    // Chercher dans la table users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, nom, prenom, telephone')
      .eq('email', email)
      .maybeSingle();
    
    if (userError) {
      console.error('❌ Erreur:', userError);
      process.exit(1);
    }
    
    if (!userData) {
      console.log('❌ Utilisateur non trouvé dans la table users');
      
      // Chercher dans auth.users
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (listError) {
        console.error('❌ Erreur listUsers:', listError);
        process.exit(1);
      }
      const found = listData.users.find((u) => u.email?.toLowerCase() === email);
      if (found) {
        console.log('⚠️ Utilisateur trouvé dans auth.users mais pas dans users');
        console.log('   ID:', found.id);
        console.log('   Email:', found.email);
      } else {
        console.log('❌ Utilisateur non trouvé du tout');
      }
      return;
    }
    
    console.log('✅ Utilisateur trouvé:');
    console.log('   ID:', userData.id);
    console.log('   Email:', userData.email);
    console.log('   Nom:', userData.nom || '(vide)');
    console.log('   Prénom:', userData.prenom || '(vide)');
    console.log('   Téléphone:', userData.telephone || '(vide)');
    console.log('\n');
    
    // Vérifier les commandes de cet utilisateur
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('id, created_at, customer_first_name, customer_last_name, customer_phone, customer_email')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (ordersError) {
      console.error('❌ Erreur récupération commandes:', ordersError);
    } else if (orders && orders.length > 0) {
      console.log(`📦 ${orders.length} dernières commandes:`);
      orders.forEach(order => {
        console.log(`\n   Commande ${order.id.slice(0, 8)}:`);
        console.log(`   Date: ${new Date(order.created_at).toLocaleString('fr-FR')}`);
        console.log(`   customer_first_name: ${order.customer_first_name || '(vide)'}`);
        console.log(`   customer_last_name: ${order.customer_last_name || '(vide)'}`);
        console.log(`   customer_phone: ${order.customer_phone || '(vide)'}`);
        console.log(`   customer_email: ${order.customer_email || '(vide)'}`);
      });
    } else {
      console.log('📦 Aucune commande trouvée pour cet utilisateur');
    }
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    process.exit(1);
  }
}

checkUserData().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});






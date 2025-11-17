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

async function checkRecentOrders() {
  try {
    console.log('🔍 Récupération des 10 dernières commandes...\n');
    
    // Récupérer les 10 dernières commandes
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('id, created_at, user_id, customer_first_name, customer_last_name, customer_phone, customer_email, restaurant_id')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (ordersError) {
      console.error('❌ Erreur:', ordersError);
      process.exit(1);
    }
    
    if (!orders || orders.length === 0) {
      console.log('❌ Aucune commande trouvée');
      return;
    }
    
    console.log(`📦 ${orders.length} commandes trouvées:\n`);
    
    for (const order of orders) {
      console.log(`Commande ${order.id.slice(0, 8)}:`);
      console.log(`  Date: ${new Date(order.created_at).toLocaleString('fr-FR')}`);
      console.log(`  user_id: ${order.user_id || '(vide)'}`);
      console.log(`  customer_first_name: ${order.customer_first_name || '(vide)'}`);
      console.log(`  customer_last_name: ${order.customer_last_name || '(vide)'}`);
      console.log(`  customer_phone: ${order.customer_phone || '(vide)'}`);
      console.log(`  customer_email: ${order.customer_email || '(vide)'}`);
      
      // Si user_id existe, récupérer les infos utilisateur
      if (order.user_id) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('email, nom, prenom')
          .eq('id', order.user_id)
          .single();
        
        if (userData) {
          console.log(`  User (depuis users): ${userData.prenom || ''} ${userData.nom || ''} (${userData.email})`);
        } else {
          console.log(`  User: non trouvé dans users`);
        }
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    process.exit(1);
  }
}

checkRecentOrders().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});




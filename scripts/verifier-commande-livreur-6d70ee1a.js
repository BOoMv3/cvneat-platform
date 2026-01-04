#!/usr/bin/env node

/**
 * Script pour vérifier si la commande était liée à un livreur
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const orderId = '6d70ee1a-8e5c-4dda-bce5-6db60adb7d32';

async function verifier() {
  try {
    console.log(`🔍 Vérification si la commande ${orderId} existe encore...\n`);

    const { data: order, error } = await supabaseAdmin
      .from('commandes')
      .select('id, livreur_id, statut')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    }

    if (!order) {
      console.log('✅ La commande a bien été supprimée de la base de données.');
      console.log('   Elle n\'apparaîtra plus dans :');
      console.log('   - Le dashboard des livreurs');
      console.log('   - Le dashboard du restaurant');
      console.log('   - L\'historique des commandes');
      console.log('   - Le suivi des commandes');
    } else {
      console.log('⚠️  La commande existe encore:');
      console.log(`   ID: ${order.id}`);
      console.log(`   Statut: ${order.statut}`);
      if (order.livreur_id) {
        console.log(`   Livreur ID: ${order.livreur_id}`);
      } else {
        console.log(`   Livreur: Aucun`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

verifier();


#!/usr/bin/env node

/**
 * Script pour supprimer une commande spécifique
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/supprimer-commande-6725fe6.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const orderIdPartial = '6725fe6-59ec-413a-b39b-ddb960824999'; // ID partiel

async function supprimerCommande() {
  try {
    console.log(`🔍 Recherche de la commande avec ID partiel: ${orderIdPartial}...\n`);

    // Chercher les commandes récentes et filtrer celles qui correspondent à l'ID partiel
    const { data: recentOrders, error: allError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, total, created_at, restaurant_id, user_id')
      .order('created_at', { ascending: false })
      .limit(500); // Limiter aux 500 dernières commandes
    
    if (allError) {
      throw allError;
    }
    
    // Filtrer celles qui contiennent l'ID partiel
    const orders = recentOrders?.filter(order => order.id.includes(orderIdPartial)) || [];
    const orderError = null;

    if (orderError || !orders || orders.length === 0) {
      console.error(`❌ Commande non trouvée avec ID partiel: ${orderIdPartial}`);
      if (orderError) {
        console.error('Erreur:', orderError);
      }
      console.log('\n💡 Astuce: L\'ID semble incomplet. Essayez de fournir l\'ID complet de la commande.');
      process.exit(1);
    }

    if (orders.length > 1) {
      console.log(`⚠️  Plusieurs commandes trouvées (${orders.length}):\n`);
      orders.forEach((order, index) => {
        console.log(`${index + 1}. ID: ${order.id}`);
        console.log(`   Statut: ${order.statut}, Total: ${order.total}€, Créée: ${order.created_at}`);
        console.log('');
      });
      console.error('❌ Plusieurs commandes correspondent. Veuillez fournir l\'ID complet.');
      process.exit(1);
    }

    const order = orders[0];

    console.log(`✅ Commande trouvée:`);
    console.log(`   ID complet: ${order.id}`);
    console.log(`   Statut: ${order.statut}`);
    console.log(`   Total: ${order.total}€`);
    if (order.restaurant_id) console.log(`   Restaurant ID: ${order.restaurant_id}`);
    if (order.user_id) console.log(`   Client ID: ${order.user_id}`);
    if (order.created_at) console.log(`   Créée le: ${order.created_at}`);
    console.log('');

    // Supprimer les détails de commande d'abord (si existent)
    console.log('🗑️  Suppression des détails de commande...');
    const { error: detailsError } = await supabaseAdmin
      .from('details_commande')
      .delete()
      .eq('commande_id', order.id);

    if (detailsError) {
      console.error('⚠️  Erreur lors de la suppression des détails:', detailsError.message);
      // Continuer même si erreur (peut-être qu'il n'y a pas de détails)
    } else {
      console.log('✅ Détails de commande supprimés (ou aucun détail)');
    }

    // Supprimer la commande
    console.log('🗑️  Suppression de la commande...');
    const { error: deleteError } = await supabaseAdmin
      .from('commandes')
      .delete()
      .eq('id', order.id);

    if (deleteError) {
      console.error('❌ Erreur lors de la suppression de la commande:', deleteError);
      process.exit(1);
    }

    console.log('✅ Commande supprimée avec succès !');
    console.log(`   ID: ${order.id}`);

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

supprimerCommande();

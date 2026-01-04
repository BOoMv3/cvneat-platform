#!/usr/bin/env node

/**
 * Script pour supprimer une commande avec ID partiel
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/supprimer-commande-6725fe6-v2.js
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

const orderIdPartial = '6725fe6-59ec-413a-b39b-ddb960824999';

async function supprimerCommande() {
  try {
    console.log(`🔍 Recherche avec ID partiel: ${orderIdPartial}...\n`);

    // Chercher les commandes récentes
    const { data: recentOrders, error: allError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, total, created_at, restaurant_id, user_id')
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (allError) {
      throw allError;
    }
    
    if (!recentOrders || recentOrders.length === 0) {
      console.error('❌ Aucune commande trouvée');
      process.exit(1);
    }

    // Filtrer celles qui contiennent l'ID partiel
    const matchingOrders = recentOrders.filter(order => 
      order.id.includes(orderIdPartial) || 
      order.id.endsWith(orderIdPartial) ||
      order.id.startsWith(orderIdPartial.substring(1)) // Essayez sans le premier caractère
    );

    // Si pas de correspondance exacte, essayer avec les caractères hexadécimaux possibles au début
    if (matchingOrders.length === 0) {
      const hexChars = '0123456789abcdef';
      for (const char of hexChars) {
        const testId = char + orderIdPartial;
        const found = recentOrders.find(order => order.id.startsWith(testId));
        if (found) {
          matchingOrders.push(found);
          break;
        }
      }
    }

    if (matchingOrders.length === 0) {
      console.error(`❌ Aucune commande trouvée avec ID partiel: ${orderIdPartial}`);
      console.log(`\n📋 ${recentOrders.length} commandes récentes vérifiées`);
      console.log('💡 Vérifiez que l\'ID est correct ou fournissez l\'ID complet.');
      process.exit(1);
    }

    if (matchingOrders.length > 1) {
      console.log(`⚠️  Plusieurs commandes trouvées (${matchingOrders.length}):\n`);
      matchingOrders.forEach((order, index) => {
        console.log(`${index + 1}. ID: ${order.id}`);
        console.log(`   Statut: ${order.statut}, Total: ${order.total}€, Créée: ${order.created_at}`);
        console.log('');
      });
      console.error('❌ Plusieurs commandes correspondent. Veuillez fournir l\'ID complet.');
      process.exit(1);
    }

    const order = matchingOrders[0];

    console.log(`✅ Commande trouvée:`);
    console.log(`   ID complet: ${order.id}`);
    console.log(`   Statut: ${order.statut}`);
    console.log(`   Total: ${order.total}€`);
    if (order.restaurant_id) console.log(`   Restaurant ID: ${order.restaurant_id}`);
    if (order.user_id) console.log(`   Client ID: ${order.user_id}`);
    if (order.created_at) console.log(`   Créée le: ${order.created_at}`);
    console.log('');

    // Supprimer les détails de commande d'abord
    console.log('🗑️  Suppression des détails de commande...');
    const { error: detailsError } = await supabaseAdmin
      .from('details_commande')
      .delete()
      .eq('commande_id', order.id);

    if (detailsError) {
      console.warn('⚠️  Aucun détail à supprimer ou erreur:', detailsError.message);
    } else {
      console.log('✅ Détails supprimés');
    }

    // Supprimer la commande
    console.log('🗑️  Suppression de la commande...');
    const { error: deleteError } = await supabaseAdmin
      .from('commandes')
      .delete()
      .eq('id', order.id);

    if (deleteError) {
      console.error('❌ Erreur lors de la suppression:', deleteError);
      process.exit(1);
    }

    console.log('\n✅ Commande supprimée avec succès !');
    console.log(`   ID: ${order.id}\n`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

supprimerCommande();


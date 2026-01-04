#!/usr/bin/env node

/**
 * Script pour supprimer une commande spécifique
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/supprimer-commande-6d70ee1a.js
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

const orderId = '6d70ee1a-8e5c-4dda-bce5-6db60adb7d32'; // ID de la commande
const stripePaymentIntentId = 'pi_3SjPOFC4JdsisQ571Qvni7Ep'; // Payment Intent ID Stripe

async function supprimerCommande() {
  try {
    console.log(`🔍 Recherche de la commande avec ID: ${orderId}...\n`);

    // Chercher la commande par ID
    let { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    // Si pas trouvée par ID, essayer par stripe_payment_intent_id
    if (!order && stripePaymentIntentId) {
      console.log(`🔍 Tentative de recherche par Payment Intent ID: ${stripePaymentIntentId}...`);
      const { data: orderByStripe, error: stripeError } = await supabaseAdmin
        .from('commandes')
        .select('*')
        .eq('stripe_payment_intent_id', stripePaymentIntentId)
        .maybeSingle();
      
      if (orderByStripe) {
        order = orderByStripe;
        orderError = null;
      }
    }

    if (orderError || !order) {
      console.error(`❌ Commande non trouvée avec ID: ${orderId}`);
      if (stripePaymentIntentId) {
        console.error(`   Payment Intent ID: ${stripePaymentIntentId}`);
      }
      if (orderError) {
        console.error('Erreur:', orderError);
      }
      process.exit(1);
    }

    console.log(`✅ Commande trouvée:`);
    console.log(`   ID: ${order.id}`);
    console.log(`   Statut: ${order.statut}`);
    console.log(`   Total: ${order.total}€`);
    console.log(`   Payment Intent: ${order.stripe_payment_intent_id || 'N/A'}`);
    console.log(`   Restaurant ID: ${order.restaurant_id || 'N/A'}`);
    console.log(`   Client ID: ${order.user_id || 'N/A'}`);
    console.log(`   Créée le: ${order.created_at}`);
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
      console.log('✅ Détails de commande supprimés');
    }

    // Supprimer les notifications liées (si existent)
    console.log('🗑️  Suppression des notifications liées...');
    const { error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .contains('data', { order_id: order.id });

    if (notificationsError) {
      console.warn('⚠️  Erreur suppression notifications (peut être normal):', notificationsError.message);
    } else {
      console.log('✅ Notifications supprimées (ou aucune)');
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

    console.log('\n✅ Commande supprimée avec succès !');
    console.log(`   ID: ${order.id}`);
    if (order.stripe_payment_intent_id) {
      console.log(`   Payment Intent: ${order.stripe_payment_intent_id}`);
      console.log('   ⚠️  Note: Le paiement Stripe n\'a pas été annulé. Si nécessaire, annulez le paiement dans Stripe Dashboard.');
    }

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

supprimerCommande();


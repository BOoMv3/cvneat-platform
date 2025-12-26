#!/usr/bin/env node

/**
 * Script pour annuler un remboursement Stripe à partir d'un Payment Intent ID
 * Usage: node scripts/cancel-refund-by-payment-intent.js <PAYMENT_INTENT_ID>
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const paymentIntentId = process.argv[2];

if (!paymentIntentId) {
  console.error('❌ Usage: node scripts/cancel-refund-by-payment-intent.js <PAYMENT_INTENT_ID>');
  console.error('   Exemple: node scripts/cancel-refund-by-payment-intent.js pi_3Siet2C4JdsisQ572UEAgT2s');
  process.exit(1);
}

if (!paymentIntentId.startsWith('pi_')) {
  console.error('❌ L\'ID doit être un Payment Intent ID (commence par pi_)');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cancelRefundByPaymentIntent() {
  try {
    console.log(`🔍 Recherche des remboursements pour le Payment Intent: ${paymentIntentId}\n`);

    // Récupérer tous les remboursements pour ce Payment Intent
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntentId,
      limit: 100
    });

    if (refunds.data.length === 0) {
      console.log('ℹ️  Aucun remboursement trouvé pour ce Payment Intent');
      
      // Vérifier si on peut trouver la commande dans la base
      const { data: order } = await supabase
        .from('commandes')
        .select('id, statut, payment_status, total, frais_livraison')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();
      
      if (order) {
        console.log(`\n📋 Commande associée trouvée: ${order.id}`);
        console.log(`   Statut: ${order.statut}`);
        console.log(`   Payment status: ${order.payment_status}`);
      }
      
      process.exit(0);
    }

    console.log(`📊 ${refunds.data.length} remboursement(s) trouvé(s):\n`);

    // Afficher tous les remboursements
    refunds.data.forEach((refund, index) => {
      console.log(`${index + 1}. Refund ID: ${refund.id}`);
      console.log(`   Montant: ${(refund.amount / 100).toFixed(2)}€`);
      console.log(`   Statut: ${refund.status}`);
      console.log(`   Créé le: ${new Date(refund.created * 1000).toLocaleString('fr-FR')}`);
      console.log('');
    });

    // Trouver les remboursements en statut "pending"
    const pendingRefunds = refunds.data.filter(r => r.status === 'pending');

    if (pendingRefunds.length === 0) {
      console.log('❌ Aucun remboursement en statut "pending" trouvé.');
      console.log('   Seuls les remboursements en statut "pending" peuvent être annulés.');
      console.log('   Les autres statuts possibles: succeeded, failed, canceled');
      process.exit(1);
    }

    // S'il y a plusieurs remboursements pending, annuler le plus récent
    const refundToCancel = pendingRefunds[0];
    
    console.log(`🔄 Annulation du remboursement: ${refundToCancel.id}`);
    console.log(`   Montant: ${(refundToCancel.amount / 100).toFixed(2)}€\n`);

    // Annuler le remboursement
    const canceledRefund = await stripe.refunds.cancel(refundToCancel.id);
    
    console.log(`✅ Remboursement annulé avec succès !`);
    console.log(`   Refund ID: ${canceledRefund.id}`);
    console.log(`   Nouveau statut: ${canceledRefund.status}`);
    console.log(`   Montant: ${(canceledRefund.amount / 100).toFixed(2)}€`);

    // Mettre à jour la commande dans la base de données
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('id, statut, payment_status, stripe_refund_id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (!orderError && order && order.stripe_refund_id === refundToCancel.id) {
      console.log(`\n📝 Mise à jour de la commande dans la base de données...`);
      
      const updateData = {
        stripe_refund_id: null,
        refund_amount: null,
        refunded_at: null,
        updated_at: new Date().toISOString()
      };

      // Si le payment_status était "refunded", le remettre à "paid"
      if (order.payment_status === 'refunded') {
        updateData.payment_status = 'paid';
        console.log('   Remise du payment_status à "paid"');
      }

      const { error: updateError } = await supabase
        .from('commandes')
        .update(updateData)
        .eq('id', order.id);

      if (updateError) {
        console.error('⚠️  Erreur lors de la mise à jour de la commande:', updateError.message);
        console.error('   Le remboursement Stripe a été annulé, mais la commande n\'a pas été mise à jour.');
      } else {
        console.log(`✅ Commande ${order.id} mise à jour avec succès`);
      }
    } else if (order && order.stripe_refund_id !== refundToCancel.id) {
      console.log(`\n⚠️  Le stripe_refund_id de la commande (${order.stripe_refund_id}) ne correspond pas au remboursement annulé (${refundToCancel.id})`);
      console.log('   La commande n\'a pas été mise à jour automatiquement.');
      console.log('   Vous devrez peut-être la mettre à jour manuellement.');
    }

    console.log(`\n✅ Opération terminée avec succès !`);

  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      console.error('❌ Erreur Stripe:', error.message);
    } else {
      console.error('❌ Erreur:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

cancelRefundByPaymentIntent();


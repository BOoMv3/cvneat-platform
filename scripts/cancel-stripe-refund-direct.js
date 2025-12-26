#!/usr/bin/env node

/**
 * Script pour annuler un remboursement Stripe directement (sans API)
 * Usage: node scripts/cancel-stripe-refund-direct.js <ORDER_ID>
 *   ou: node scripts/cancel-stripe-refund-direct.js --refund-id <STRIPE_REFUND_ID>
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const orderId = process.argv[2];
const refundId = process.argv[2] === '--refund-id' ? process.argv[3] : null;
const actualOrderId = refundId ? null : orderId;

if (!actualOrderId && !refundId) {
  console.error('❌ Usage: node scripts/cancel-stripe-refund-direct.js <ORDER_ID>');
  console.error('   ou: node scripts/cancel-stripe-refund-direct.js --refund-id <STRIPE_REFUND_ID>');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cancelRefund() {
  try {
    let stripeRefundId = refundId;
    let orderData = null;

    // Si on a un order ID, récupérer les infos depuis la base
    if (actualOrderId) {
      console.log(`🔍 Récupération des infos de la commande: ${actualOrderId}`);
      
      const { data: order, error: orderError } = await supabase
        .from('commandes')
        .select('id, stripe_refund_id, stripe_payment_intent_id, statut, payment_status, total, frais_livraison')
        .eq('id', actualOrderId)
        .single();

      if (orderError || !order) {
        console.error('❌ Commande non trouvée:', orderError?.message);
        process.exit(1);
      }

      orderData = order;
      stripeRefundId = order.stripe_refund_id;

      if (!stripeRefundId) {
        console.error('❌ Aucun remboursement Stripe trouvé pour cette commande');
        console.error('   La commande n\'a pas de stripe_refund_id');
        process.exit(1);
      }

      console.log(`   Stripe Refund ID: ${stripeRefundId}`);
    }

    // Récupérer les détails du remboursement depuis Stripe
    console.log(`\n🔍 Vérification du remboursement Stripe: ${stripeRefundId}`);
    
    const refund = await stripe.refunds.retrieve(stripeRefundId);
    
    console.log(`   Statut: ${refund.status}`);
    console.log(`   Montant: ${(refund.amount / 100).toFixed(2)}€`);

    // Vérifier que le remboursement est encore en attente
    if (refund.status !== 'pending') {
      console.error(`\n❌ Ce remboursement ne peut pas être annulé. Statut actuel: ${refund.status}`);
      console.error('   Seuls les remboursements en statut "pending" peuvent être annulés.');
      process.exit(1);
    }

    // Annuler le remboursement Stripe
    console.log(`\n🔄 Annulation du remboursement...`);
    const canceledRefund = await stripe.refunds.cancel(stripeRefundId);
    
    console.log(`✅ Remboursement Stripe annulé: ${canceledRefund.id}`);
    console.log(`   Nouveau statut: ${canceledRefund.status}`);

    // Mettre à jour la commande dans la base de données
    if (actualOrderId && orderData) {
      console.log(`\n📝 Mise à jour de la commande dans la base de données...`);
      
      const updateData = {
        stripe_refund_id: null,
        refund_amount: null,
        refunded_at: null,
        updated_at: new Date().toISOString()
      };

      // Si le payment_status était "refunded", le remettre à "paid"
      if (orderData.payment_status === 'refunded') {
        updateData.payment_status = 'paid';
        console.log('   Remise du payment_status à "paid"');
      }

      const { error: updateError } = await supabase
        .from('commandes')
        .update(updateData)
        .eq('id', actualOrderId);

      if (updateError) {
        console.error('⚠️  Erreur lors de la mise à jour de la commande:', updateError.message);
        console.error('   Le remboursement Stripe a été annulé, mais la commande n\'a pas été mise à jour.');
      } else {
        console.log('✅ Commande mise à jour avec succès');
      }
    }

    console.log(`\n✅ Opération terminée avec succès !`);
    console.log(`   Remboursement Stripe ID: ${canceledRefund.id}`);
    console.log(`   Statut: ${canceledRefund.status}`);

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

cancelRefund();


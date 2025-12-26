#!/usr/bin/env node

/**
 * Script pour vérifier le statut d'un remboursement Stripe
 * Usage: node scripts/verifier-remboursement-stripe.js <STRIPE_REFUND_ID>
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripeRefundId = process.argv[2];

if (!stripeRefundId) {
  console.error('❌ Usage: node scripts/verifier-remboursement-stripe.js <STRIPE_REFUND_ID>');
  console.error('   Exemple: node scripts/verifier-remboursement-stripe.js re_1234567890abcdef');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkRefundStatus() {
  try {
    console.log(`🔍 Vérification du remboursement Stripe: ${stripeRefundId}\n`);
    
    const refund = await stripe.refunds.retrieve(stripeRefundId);
    
    console.log('📊 Détails du remboursement:');
    console.log(`   ID: ${refund.id}`);
    console.log(`   Montant: ${(refund.amount / 100).toFixed(2)}€`);
    console.log(`   Statut: ${refund.status}`);
    console.log(`   Raison: ${refund.reason || 'N/A'}`);
    console.log(`   Créé le: ${new Date(refund.created * 1000).toLocaleString('fr-FR')}`);
    
    if (refund.status === 'pending') {
      console.log('\n✅ Ce remboursement peut être annulé (statut: pending)');
      console.log('   Utilisez: node scripts/cancel-stripe-refund.js ' + stripeRefundId);
    } else if (refund.status === 'succeeded') {
      console.log('\n❌ Ce remboursement ne peut PAS être annulé (statut: succeeded)');
      console.log('   Les fonds ont déjà été renvoyés au client.');
    } else {
      console.log(`\n⚠️  Statut: ${refund.status}`);
    }
    
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      console.error('❌ Remboursement non trouvé:', error.message);
    } else {
      console.error('❌ Erreur:', error.message);
    }
    process.exit(1);
  }
}

checkRefundStatus();


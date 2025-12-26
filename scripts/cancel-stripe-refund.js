#!/usr/bin/env node

/**
 * Script pour annuler un remboursement Stripe
 * Usage: node scripts/cancel-stripe-refund.js <STRIPE_REFUND_ID> [ADMIN_TOKEN]
 *   ou: node scripts/cancel-stripe-refund.js --order-id <ORDER_ID> [ADMIN_TOKEN]
 */

require('dotenv').config({ path: '.env.local' });

let stripeRefundId = null;
let orderId = null;
let adminToken = null;

// Parser les arguments
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--order-id') {
    orderId = process.argv[i + 1];
    i++; // Skip next argument as it's the order ID value
  } else if (process.argv[i].startsWith('re_')) {
    stripeRefundId = process.argv[i];
  } else if (process.argv[i].length > 50 || process.argv[i].startsWith('eyJ')) {
    // Token admin (long string or JWT)
    adminToken = process.argv[i];
  }
}

// Si pas de token dans les args, utiliser env
if (!adminToken) {
  adminToken = process.env.ADMIN_TOKEN;
}

if (!stripeRefundId && !orderId) {
  console.error('❌ Usage: node scripts/cancel-stripe-refund.js <STRIPE_REFUND_ID> [ADMIN_TOKEN]');
  console.error('   ou: node scripts/cancel-stripe-refund.js --order-id <ORDER_ID> [ADMIN_TOKEN]');
  console.error('   Ou définissez ADMIN_TOKEN dans les variables d\'environnement');
  console.error('');
  console.error('Arguments reçus:', process.argv.slice(2));
  process.exit(1);
}

if (!adminToken) {
  console.error('❌ Token admin requis');
  console.error('   Fournissez-le comme argument ou définissez ADMIN_TOKEN dans les variables d\'environnement');
  process.exit(1);
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function cancelRefund() {
  try {
    let url = `${baseUrl}/api/stripe/refund?`;
    if (stripeRefundId) {
      url += `refund_id=${stripeRefundId}`;
    } else if (orderId) {
      url += `order_id=${orderId}`;
    }
    
    console.log(`🔄 Annulation du remboursement Stripe...`);
    if (stripeRefundId) {
      console.log(`   Refund ID: ${stripeRefundId}`);
    } else if (orderId) {
      console.log(`   Order ID: ${orderId}`);
    }
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erreur:', data.error || data.message || 'Erreur inconnue');
      if (data.refund_status) {
        console.error(`   Statut du remboursement: ${data.refund_status}`);
        console.error('   ⚠️  Seuls les remboursements en statut "pending" peuvent être annulés.');
      }
      if (data.details) {
        console.error('   Détails:', data.details);
      }
      process.exit(1);
    }

    console.log('✅', data.message);
    if (data.refund) {
      console.log('💰 Remboursement:', {
        id: data.refund.id,
        amount: `${data.refund.amount}€`,
        status: data.refund.status
      });
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'appel API:', error.message);
    process.exit(1);
  }
}

cancelRefund();


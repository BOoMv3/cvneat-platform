#!/usr/bin/env node

/**
 * Script pour annuler une commande spécifique et rembourser le client
 * Usage: node scripts/cancel-order.js <ORDER_ID> [ADMIN_TOKEN]
 */

const orderId = process.argv[2];
const adminToken = process.argv[3] || process.env.ADMIN_TOKEN;

if (!orderId) {
  console.error('❌ Usage: node scripts/cancel-order.js <ORDER_ID> [ADMIN_TOKEN]');
  console.error('   Ou définissez ADMIN_TOKEN dans les variables d\'environnement');
  process.exit(1);
}

if (!adminToken) {
  console.error('❌ Token admin requis');
  console.error('   Fournissez-le comme argument ou définissez ADMIN_TOKEN dans les variables d\'environnement');
  process.exit(1);
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function cancelOrder() {
  try {
    console.log(`🔄 Annulation de la commande ${orderId}...`);
    
    const response = await fetch(`${baseUrl}/api/admin/orders/cancel/${orderId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erreur:', data.error || data.message || 'Erreur inconnue');
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
    console.log('📋 Order ID:', data.order_id);

  } catch (error) {
    console.error('❌ Erreur lors de l\'appel API:', error.message);
    process.exit(1);
  }
}

cancelOrder();


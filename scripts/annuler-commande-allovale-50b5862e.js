/**
 * Script pour annuler la commande d'All'ovale pizza et rembourser le client
 * ID de commande: 50b5862e-384b-40e4-a572-82325ede248b
 * Usage: node scripts/annuler-commande-allovale-50b5862e.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY manquante');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey);

const ORDER_ID = '50b5862e-384b-40e4-a572-82325ede248b';

async function annulerCommandeAllovale() {
  try {
    console.log(`🔍 Recherche de la commande ${ORDER_ID}...\n`);
    
    // 1. Récupérer la commande
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(id, nom, email),
        users:user_id(id, email, nom, prenom)
      `)
      .eq('id', ORDER_ID)
      .single();

    if (orderError || !order) {
      console.error('❌ Commande non trouvée:', orderError?.message || 'Commande introuvable');
      return;
    }

    const restaurant = order.restaurant;
    const user = order.users;

    console.log(`✅ Commande trouvée:`);
    console.log(`   ID: ${order.id}`);
    console.log(`   Restaurant: ${restaurant?.nom || 'N/A'}`);
    console.log(`   Date: ${new Date(order.created_at).toLocaleString('fr-FR')}`);
    console.log(`   Statut: ${order.statut}`);
    console.log(`   Payment Status: ${order.payment_status}`);
    console.log(`   Total: ${order.total}€`);
    console.log(`   Frais livraison: ${order.frais_livraison}€`);
    console.log(`   Client: ${user?.prenom || ''} ${user?.nom || ''} (${user?.email || 'N/A'})`);
    console.log(`   Payment Intent: ${order.stripe_payment_intent_id || 'N/A'}`);

    // Vérifier si déjà annulée
    if (order.statut === 'annulee') {
      console.log('\nℹ️ Cette commande est déjà annulée');
      return;
    }

    const deliveryFee = parseFloat(order.frais_livraison || 0);
    const orderTotal = parseFloat(order.total || 0);
    const refundAmount = orderTotal + deliveryFee;

    // 2. Rembourser si nécessaire
    let refund = null;
    const needsRefund = 
      (order.payment_status === 'paid' || order.payment_status === 'succeeded') &&
      order.stripe_payment_intent_id &&
      refundAmount > 0;

    if (needsRefund) {
      console.log(`\n💰 Création du remboursement Stripe (${refundAmount.toFixed(2)}€)...`);
      try {
        refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent_id,
          amount: Math.round(refundAmount * 100), // Stripe utilise les centimes
          reason: 'requested_by_customer',
          metadata: {
            order_id: ORDER_ID,
            cancellation_reason: 'Commande annulée par l\'admin',
            admin_action: 'cancel_specific_order'
          }
        });

        console.log(`✅ Remboursement créé: ${refund.id}`);
        console.log(`   Montant remboursé: ${refundAmount.toFixed(2)}€`);
        console.log(`   Statut: ${refund.status}`);
      } catch (stripeError) {
        console.error('❌ Erreur remboursement Stripe:', stripeError.message);
        console.log('⚠️ La commande sera quand même annulée dans la base de données');
      }
    } else {
      console.log('ℹ️ Aucun remboursement nécessaire (commande non payée ou pas de Payment Intent)');
    }

    // 3. Annuler la commande dans la base de données
    console.log('\n📝 Annulation de la commande dans la base de données...');
    const updatePayload = {
      statut: 'annulee',
      updated_at: new Date().toISOString()
    };

    if (refund) {
      updatePayload.payment_status = 'refunded';
      updatePayload.stripe_refund_id = refund.id;
      updatePayload.refund_amount = refundAmount;
      updatePayload.refunded_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('commandes')
      .update(updatePayload)
      .eq('id', ORDER_ID);

    if (updateError) {
      console.error('❌ Erreur mise à jour commande:', updateError);
      return;
    }
    console.log('✅ Commande annulée dans la base de données');

    // 4. Créer une notification pour le client
    if (order.user_id) {
      try {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: order.user_id,
            type: 'order_cancelled_refunded',
            title: 'Commande annulée',
            message: `Votre commande #${ORDER_ID.slice(0, 8)} a été annulée.${refund ? ` Un remboursement de ${refundAmount.toFixed(2)}€ sera visible sur votre compte dans 2-5 jours ouvrables.` : ''}`,
            data: {
              order_id: ORDER_ID,
              refund_id: refund?.id || null,
              refund_amount: refund ? refundAmount : null,
              reason: 'Commande annulée par l\'admin'
            },
            read: false,
            created_at: new Date().toISOString()
          });
        console.log('✅ Notification créée pour le client');
      } catch (notificationError) {
        console.warn('⚠️ Erreur création notification:', notificationError.message);
      }
    }

    console.log('\n✅ Opération terminée avec succès !');
    console.log('\n📊 Résumé:');
    console.log(`   - Commande annulée: ${ORDER_ID}`);
    console.log(`   - Restaurant: ${restaurant?.nom || 'N/A'}`);
    console.log(`   - Remboursement: ${refund ? `${refundAmount.toFixed(2)}€ (${refund.id})` : 'Non applicable'}`);

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    process.exit(1);
  }
}

// Exécuter le script
annulerCommandeAllovale()
  .then(() => {
    console.log('\n✨ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });


#!/usr/bin/env node

/**
 * Script pour annuler et rembourser la commande #05ec8176 du "99 Street Food"
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et STRIPE_SECRET_KEY dans .env.local
 * Usage: node scripts/annuler-commande-05ec8176.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
  console.error('❌ Variables d\'environnement manquantes: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey);

async function annulerCommande() {
  try {
    const orderId = '05ec8176-3da0-4c1f-b192-4fd0faf453f1';
    console.log(`🔍 Recherche de la commande ${orderId}...\n`);

    // Récupérer la commande
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('❌ Commande non trouvée:', orderError?.message || 'Commande introuvable');
      process.exit(1);
    }

    console.log(`✅ Commande trouvée:`);
    console.log(`   ID: ${order.id}`);
    console.log(`   Statut: ${order.statut}`);
    console.log(`   Montant: ${order.total}€`);
    console.log(`   Payment Intent: ${order.stripe_payment_intent_id || 'N/A'}`);
    console.log(`   Payment Status: ${order.payment_status || 'N/A'}\n`);

    // Vérifier si déjà annulée
    if (order.statut === 'annulee') {
      console.log('ℹ️  Cette commande est déjà annulée.');
      process.exit(0);
    }

    // Calculer le montant à rembourser
    const deliveryFee = parseFloat(order.frais_livraison || 0);
    const orderTotal = parseFloat(order.total || 0);
    const refundAmount = orderTotal + deliveryFee;

    let refund = null;

    // Rembourser si payé
    if (
      (order.payment_status === 'paid' || order.payment_status === 'succeeded') &&
      order.stripe_payment_intent_id &&
      refundAmount > 0
    ) {
      console.log(`💰 Vérification du montant disponible pour remboursement...`);

      try {
        // Récupérer le Payment Intent pour connaître le montant déjà remboursé
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
        const alreadyRefunded = paymentIntent.amount_received - (paymentIntent.amount - paymentIntent.amount_refunded);
        const availableToRefund = (paymentIntent.amount - paymentIntent.amount_refunded) / 100;

        console.log(`   Montant total: ${(paymentIntent.amount / 100).toFixed(2)}€`);
        console.log(`   Déjà remboursé: ${(paymentIntent.amount_refunded / 100).toFixed(2)}€`);
        console.log(`   Disponible pour remboursement: ${availableToRefund.toFixed(2)}€`);

        if (availableToRefund <= 0) {
          console.log('ℹ️  Le paiement a déjà été entièrement remboursé.\n');
        } else {
          const refundAmountToUse = Math.min(refundAmount, availableToRefund);
          console.log(`💰 Création du remboursement Stripe de ${refundAmountToUse.toFixed(2)}€...`);

          refund = await stripe.refunds.create({
            payment_intent: order.stripe_payment_intent_id,
            amount: Math.round(refundAmountToUse * 100), // Stripe utilise les centimes
            reason: 'requested_by_customer',
            metadata: {
              order_id: orderId,
              cancellation_reason: 'Commande annulée par l\'admin',
              admin_action: 'cancel_order'
            }
          });

          console.log(`✅ Remboursement Stripe créé: ${refund.id}`);
          console.log(`   Statut: ${refund.status}`);
          console.log(`   Montant: ${(refund.amount / 100).toFixed(2)}€\n`);
        }

      } catch (stripeError) {
        console.error('❌ Erreur lors du remboursement Stripe:', stripeError.message);
        console.log('⚠️  La commande sera annulée sans remboursement supplémentaire.\n');
      }
    } else {
      console.log('ℹ️  Aucun remboursement nécessaire (commande non payée ou pas de payment intent)\n');
    }

    // Mettre à jour la commande
    console.log('📝 Mise à jour du statut de la commande...');

    const updatePayload = {
      statut: 'annulee',
      updated_at: new Date().toISOString()
    };

    if (refund) {
      updatePayload.payment_status = 'refunded';
      updatePayload.stripe_refund_id = refund.id;
      updatePayload.refund_amount = refund.amount / 100; // Convertir de centimes en euros
      updatePayload.refunded_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('commandes')
      .update(updatePayload)
      .eq('id', orderId);

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour de la commande:', updateError);
      process.exit(1);
    }

    console.log('✅ Commande annulée avec succès !\n');

    // Créer une notification pour le client
    if (order.user_id) {
      try {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: order.user_id,
            type: 'order_cancelled_refunded',
            title: 'Commande annulée et remboursée',
            message: `Votre commande #${orderId.slice(0, 8)} a été annulée. ${refund ? `Un remboursement de ${refundAmount.toFixed(2)}€ sera visible sur votre compte dans 2-5 jours ouvrables.` : ''}`,
            data: {
              order_id: orderId,
              refund_id: refund?.id || null,
              refund_amount: refund ? refundAmount : null,
              reason: 'Commande annulée par l\'admin'
            },
            read: false,
            created_at: new Date().toISOString()
          });
        console.log('✅ Notification client créée');
      } catch (notificationError) {
        console.warn('⚠️  Erreur création notification (non bloquant):', notificationError.message);
      }
    }

    console.log('\n✅ Opération terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

annulerCommande();


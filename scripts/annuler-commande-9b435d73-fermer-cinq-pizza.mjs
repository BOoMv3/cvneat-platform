#!/usr/bin/env node

/**
 * Script: annuler + rembourser commande #9b435d73 et fermer Le Cinq Pizza
 * Usage: node scripts/annuler-commande-9b435d73-fermer-cinq-pizza.mjs
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
  console.error('❌ Variables manquantes: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey);

const ORDER_ID = '9b435d73-be20-40b9-8af0-2938c82c8a98';

async function run() {
  try {
    // 1. Annuler et rembourser la commande
    console.log('🔍 Commande #9b435d73...\n');
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', ORDER_ID)
      .single();

    if (orderError || !order) {
      console.error('❌ Commande non trouvée:', orderError?.message || 'Commande introuvable');
      process.exit(1);
    }

    console.log(`✅ Commande: ${order.id} | Statut: ${order.statut} | Total: ${order.total}€`);

    if (order.statut === 'annulee') {
      console.log('ℹ️  Commande déjà annulée.');
    } else {
      const deliveryFee = parseFloat(order.frais_livraison || 0);
      const orderTotal = parseFloat(order.total || 0);
      const refundAmount = orderTotal + deliveryFee;
      let refund = null;

      if (
        (order.payment_status === 'paid' || order.payment_status === 'succeeded') &&
        order.stripe_payment_intent_id &&
        refundAmount > 0
      ) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
          const totalAmount = paymentIntent.amount || 0;
          const alreadyRefunded = paymentIntent.amount_refunded || 0;
          const availableToRefund = (totalAmount - alreadyRefunded) / 100;

          if (availableToRefund > 0) {
            const toRefund = Math.min(refundAmount, availableToRefund);
            console.log(`💰 Remboursement Stripe: ${toRefund.toFixed(2)}€...`);

            refund = await stripe.refunds.create({
              payment_intent: order.stripe_payment_intent_id,
              amount: Math.round(toRefund * 100),
              reason: 'requested_by_customer',
              metadata: {
                order_id: ORDER_ID,
                cancellation_reason: 'Annulation par admin - Cinq Pizza fermé',
                admin_action: 'cancel_order'
              }
            });
            console.log(`✅ Remboursement créé: ${refund.id}`);
          } else {
            console.log('ℹ️  Montant déjà remboursé.');
          }
        } catch (stripeErr) {
          console.error('❌ Erreur Stripe:', stripeErr.message);
        }
      }

      const updatePayload = {
        statut: 'annulee',
        cancellation_reason: 'Annulation par admin - Cinq Pizza fermé',
        updated_at: new Date().toISOString()
      };
      if (refund) {
        updatePayload.payment_status = 'refunded';
        updatePayload.stripe_refund_id = refund.id;
        updatePayload.refund_amount = refund.amount / 100;
        updatePayload.refunded_at = new Date().toISOString();
      }

      await supabaseAdmin.from('commandes').update(updatePayload).eq('id', ORDER_ID);
      console.log('✅ Commande annulée.\n');

      if (order.user_id) {
        await supabaseAdmin.from('notifications').insert({
          user_id: order.user_id,
          type: 'order_cancelled_refunded',
          title: 'Commande annulée et remboursée',
          message: `Votre commande #9b435d73 a été annulée. ${refund ? `Un remboursement sera visible dans 2-5 jours ouvrables.` : ''}`,
          data: { order_id: ORDER_ID, refund_id: refund?.id },
          read: false,
          created_at: new Date().toISOString()
        });
      }
    }

    // 2. Fermer Le Cinq Pizza
    console.log('🔍 Recherche de Le Cinq Pizza...\n');
    const { data: restaurants, error: searchError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .or('nom.ilike.%cinq pizza%,nom.ilike.%le cinq%');

    if (searchError || !restaurants?.length) {
      console.error('❌ Restaurant Le Cinq Pizza non trouvé:', searchError?.message);
      process.exit(1);
    }

    const cinqPizza = restaurants[0];
    console.log(`📋 Restaurant: ${cinqPizza.nom} (ID: ${cinqPizza.id})`);

    if (cinqPizza.ferme_manuellement === true) {
      console.log('ℹ️  Le Cinq Pizza est déjà fermé manuellement.');
    } else {
      await supabaseAdmin
        .from('restaurants')
        .update({ ferme_manuellement: true, updated_at: new Date().toISOString() })
        .eq('id', cinqPizza.id);
      console.log('✅ Le Cinq Pizza fermé manuellement.');
    }

    console.log('\n✅ Terminé.');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

run();

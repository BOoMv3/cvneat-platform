import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// POST /api/stripe/webhook - Webhook Stripe pour les remboursements
export async function POST(request) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature || !webhookSecret) {
      console.error('❌ Signature Stripe manquante ou webhook secret non configuré');
      return NextResponse.json(
        { error: 'Signature manquante' },
        { status: 400 }
      );
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('❌ Erreur vérification signature Stripe:', err.message);
      return NextResponse.json(
        { error: 'Signature invalide' },
        { status: 400 }
      );
    }

    console.log('🔔 Webhook Stripe reçu:', event.type);

    // Traiter les différents types d'événements
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;

      case 'refund.created':
        await handleRefundCreated(event.data.object);
        break;

      case 'refund.updated':
        await handleRefundUpdated(event.data.object);
        break;

      default:
        console.log(`ℹ️ Événement Stripe non traité: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Erreur webhook Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// Gestion du paiement réussi
async function handlePaymentSucceeded(paymentIntent) {
  console.log('✅ Paiement réussi:', paymentIntent.id);
  
  try {
    // Mettre à jour le statut de la commande si nécessaire
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('id, order_number, customer_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (orderError || !order) {
      console.warn('⚠️ Commande non trouvée pour le payment intent:', paymentIntent.id);
      return;
    }

    // Mettre à jour le statut de la commande
    const { error: updateError } = await supabase
      .from('commandes')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour commande:', updateError);
    } else {
      console.log('✅ Statut de commande mis à jour:', order.order_number);
    }

  } catch (error) {
    console.error('❌ Erreur traitement paiement réussi:', error);
  }
}

// Gestion du paiement échoué
async function handlePaymentFailed(paymentIntent) {
  console.log('❌ Paiement échoué:', paymentIntent.id);
  
  try {
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('id, order_number, customer_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (orderError || !order) {
      console.warn('⚠️ Commande non trouvée pour le payment intent:', paymentIntent.id);
      return;
    }

    // Mettre à jour le statut de la commande
    const { error: updateError } = await supabase
      .from('commandes')
      .update({
        payment_status: 'failed',
        statut: 'annulee',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour commande:', updateError);
    } else {
      console.log('✅ Commande annulée:', order.order_number);
    }

  } catch (error) {
    console.error('❌ Erreur traitement paiement échoué:', error);
  }
}

// Gestion des litiges créés
async function handleDisputeCreated(dispute) {
  console.log('⚠️ Litige créé:', dispute.id);
  
  try {
    // Trouver la commande liée au litige
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('id, order_number, customer_id, restaurant_id')
      .eq('stripe_charge_id', dispute.charge)
      .single();

    if (orderError || !order) {
      console.warn('⚠️ Commande non trouvée pour le litige:', dispute.id);
      return;
    }

    // Créer automatiquement une réclamation pour le litige
    const { error: complaintError } = await supabase
      .from('complaints')
      .insert([{
        order_id: order.id,
        customer_id: order.customer_id,
        restaurant_id: order.restaurant_id,
        complaint_type: 'dispute',
        title: `Litige Stripe: ${dispute.reason}`,
        description: `Litige créé automatiquement par Stripe. Raison: ${dispute.reason}. Montant: ${dispute.amount / 100}€`,
        status: 'pending',
        is_flagged: true,
        flag_reason: 'Litige Stripe - Priorité haute',
        stripe_dispute_id: dispute.id
      }]);

    if (complaintError) {
      console.error('❌ Erreur création réclamation pour litige:', complaintError);
    } else {
      console.log('✅ Réclamation créée pour litige:', dispute.id);
    }

  } catch (error) {
    console.error('❌ Erreur traitement litige:', error);
  }
}

// Gestion du paiement annulé
async function handlePaymentCanceled(paymentIntent) {
  console.log('🚫 Paiement annulé:', paymentIntent.id);
  
  try {
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('id, order_number, customer_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (orderError || !order) {
      console.warn('⚠️ Commande non trouvée pour le payment intent:', paymentIntent.id);
      return;
    }

    // Mettre à jour le statut de la commande
    const { error: updateError } = await supabase
      .from('commandes')
      .update({
        payment_status: 'cancelled',
        statut: 'annulee',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour commande:', updateError);
    } else {
      console.log('✅ Commande annulée:', order.order_number);
    }

  } catch (error) {
    console.error('❌ Erreur traitement paiement annulé:', error);
  }
}

// Gestion du remboursement créé
async function handleRefundCreated(refund) {
  console.log('💰 Remboursement créé:', refund.id);
  
  try {
    // Trouver la commande liée au remboursement
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('id, order_number, customer_id')
      .eq('stripe_payment_intent_id', refund.payment_intent)
      .single();

    if (orderError || !order) {
      console.warn('⚠️ Commande non trouvée pour le remboursement:', refund.id);
      return;
    }

    // Mettre à jour la réclamation si elle existe
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select('id')
      .eq('order_id', order.id)
      .eq('status', 'approved')
      .single();

    if (complaint) {
      const { error: updateError } = await supabase
        .from('complaints')
        .update({
          final_refund_amount: refund.amount / 100,
          status: 'approved',
          resolved_at: new Date().toISOString(),
          stripe_refund_id: refund.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', complaint.id);

      if (updateError) {
        console.error('❌ Erreur mise à jour réclamation:', updateError);
      } else {
        console.log('✅ Réclamation mise à jour avec remboursement:', refund.id);
      }
    }

    // Envoyer une notification au client
    await sendRefundNotification(order.customer_id, refund);

  } catch (error) {
    console.error('❌ Erreur traitement remboursement créé:', error);
  }
}

// Gestion du remboursement mis à jour
async function handleRefundUpdated(refund) {
  console.log('💰 Remboursement mis à jour:', refund.id);
  
  try {
    // Mettre à jour le statut du remboursement dans la base
    const { error: updateError } = await supabase
      .from('complaints')
      .update({
        stripe_refund_status: refund.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_refund_id', refund.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour statut remboursement:', updateError);
    } else {
      console.log('✅ Statut remboursement mis à jour:', refund.status);
    }

  } catch (error) {
    console.error('❌ Erreur traitement remboursement mis à jour:', error);
  }
}

// Envoyer une notification de remboursement
async function sendRefundNotification(customerId, refund) {
  try {
    // Récupérer les informations du client
    const { data: customer, error: customerError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      console.warn('⚠️ Client non trouvé pour notification remboursement');
      return;
    }

    // Créer une notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([{
        user_id: customerId,
        type: 'refund_processed',
        title: 'Remboursement traité',
        message: `Votre remboursement de ${refund.amount / 100}€ a été traité et sera visible sur votre compte dans 2-5 jours ouvrables.`,
        data: {
          refund_id: refund.id,
          amount: refund.amount / 100,
          status: refund.status
        },
        read: false,
        created_at: new Date().toISOString()
      }]);

    if (notificationError) {
      console.error('❌ Erreur création notification remboursement:', notificationError);
    } else {
      console.log('✅ Notification remboursement envoyée');
    }

  } catch (error) {
    console.error('❌ Erreur envoi notification remboursement:', error);
  }
}

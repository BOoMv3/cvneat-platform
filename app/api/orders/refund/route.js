import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/orders/refund - Rembourser une commande
export async function POST(request) {
  try {
    const { orderId, reason, amount } = await request.json();

    if (!orderId || !reason) {
      return NextResponse.json(
        { error: 'ID commande et raison requis' },
        { status: 400 }
      );
    }

    // Récupérer la commande
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('*, payment_intent_id, total_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que la commande peut être remboursée
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cette commande ne peut pas être remboursée' },
        { status: 400 }
      );
    }

    const refundAmount = amount || order.total_amount;

    // Créer le remboursement Stripe
    let refund;
    if (order.payment_intent_id) {
      try {
        refund = await stripe.refunds.create({
          payment_intent: order.payment_intent_id,
          amount: Math.round(refundAmount * 100), // Stripe utilise les centimes
          reason: 'requested_by_customer',
          metadata: {
            order_id: orderId,
            reason: reason
          }
        });
      } catch (stripeError) {
        console.error('Erreur Stripe remboursement:', stripeError);
        return NextResponse.json(
          { error: 'Erreur lors du remboursement Stripe' },
          { status: 500 }
        );
      }
    }

    // Mettre à jour la commande
    const { error: updateError } = await supabase
      .from('commandes')
      .update({
        statut: 'annulee',
        cancellation_reason: reason,
        refund_amount: refundAmount,
        refund_id: refund?.id || null,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Erreur mise à jour commande:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la commande' },
        { status: 500 }
      );
    }

    // Mettre à jour le statut de paiement
    const { error: paymentError } = await supabase
      .from('paiements')
      .update({
        status: 'rembourse',
        refund_id: refund?.id || null,
        refunded_at: new Date().toISOString()
      })
      .eq('commande_id', orderId);

    if (paymentError) {
      console.error('Erreur mise à jour paiement:', paymentError);
    }

    // Notifier le client
    await notifyCustomerRefund(orderId, refundAmount, reason);

    return NextResponse.json({
      success: true,
      message: 'Remboursement effectué avec succès',
      refund: {
        id: refund?.id,
        amount: refundAmount,
        reason: reason
      }
    });

  } catch (error) {
    console.error('Erreur remboursement:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors du remboursement' },
      { status: 500 }
    );
  }
}

// Fonction pour notifier le client du remboursement
async function notifyCustomerRefund(orderId, amount, reason) {
  try {
    // Récupérer les infos du client
    const { data: order } = await supabase
      .from('commandes')
      .select('customer_email, customer_name, customer_phone')
      .eq('id', orderId)
      .single();

    if (!order) return;

    // Envoyer une notification (email, SMS, push, etc.)
    console.log(`📧 Notification remboursement envoyée à ${order.customer_email}`);
    console.log(`💰 Montant remboursé: ${amount}€`);
    console.log(`📝 Raison: ${reason}`);

    // Ici vous pouvez intégrer un service d'email/SMS
    // await sendRefundEmail(order.customer_email, amount, reason);
    // await sendRefundSMS(order.customer_phone, amount, reason);

  } catch (error) {
    console.error('Erreur notification remboursement:', error);
  }
}

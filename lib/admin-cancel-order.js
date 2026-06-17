import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function isPaidStatus(paymentStatus) {
  const s = (paymentStatus || '').toString().trim().toLowerCase();
  return s === 'paid' || s === 'succeeded';
}

/**
 * Annule une commande côté admin et rembourse le montant réellement payé sur Stripe.
 */
export async function cancelOrderWithRefund(supabaseAdmin, orderId, { adminAction = 'admin_cancel_order' } = {}) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('commandes')
    .select(
      'id, statut, total, frais_livraison, payment_status, stripe_payment_intent_id, stripe_refund_id, refund_amount, user_id'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { error: 'Commande non trouvée', status: 404 };
  }

  if (order.statut === 'annulee') {
    return {
      success: true,
      message: 'Cette commande est déjà annulée',
      order_id: orderId,
      status: order.statut,
      payment_status: order.payment_status,
      refund: order.stripe_refund_id
        ? { id: order.stripe_refund_id, amount: order.refund_amount, status: 'succeeded' }
        : null,
    };
  }

  let refund = null;
  let refundAmount = 0;

  if (order.stripe_refund_id) {
    refundAmount = round2(order.refund_amount || 0);
  } else if (isPaidStatus(order.payment_status) && order.stripe_payment_intent_id) {
    const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
    const totalPaid = (pi.amount || 0) / 100;
    const alreadyRefunded = (pi.amount_refunded || 0) / 100;
    const available = round2(totalPaid - alreadyRefunded);

    if (available > 0) {
      refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: Math.round(available * 100),
        reason: 'requested_by_customer',
        metadata: {
          order_id: orderId,
          admin_action: adminAction,
        },
      });
      refundAmount = round2(refund.amount / 100);
    }
  }

  const updatePayload = {
    statut: 'annulee',
    updated_at: new Date().toISOString(),
  };

  if (refund) {
    updatePayload.payment_status = 'refunded';
    updatePayload.stripe_refund_id = refund.id;
    updatePayload.refund_amount = refundAmount;
    updatePayload.refunded_at = new Date().toISOString();
  } else if (isPaidStatus(order.payment_status)) {
    updatePayload.payment_status = 'refunded';
  } else {
    updatePayload.payment_status = 'cancelled';
  }

  const { error: updateError } = await supabaseAdmin
    .from('commandes')
    .update(updatePayload)
    .eq('id', orderId);

  if (updateError) {
    return {
      error: 'Erreur lors de la mise à jour de la commande',
      details: updateError.message,
      status: 500,
      stripe_refund_id: refund?.id || null,
    };
  }

  if (refund && order.user_id) {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: order.user_id,
        type: 'order_cancelled_refunded',
        title: 'Commande annulée et remboursée',
        message: `Votre commande #${orderId.slice(0, 8)} a été annulée. Un remboursement de ${refundAmount.toFixed(2)}€ sera visible sous 2 à 5 jours ouvrables.`,
        data: { order_id: orderId, refund_id: refund.id, refund_amount: refundAmount },
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (notificationError) {
      console.warn(`Notification annulation ${orderId}:`, notificationError);
    }
  }

  if (refund) {
    try {
      await supabaseAdmin
        .from('paiements')
        .update({
          status: 'rembourse',
          refund_id: refund.id,
          refunded_at: new Date().toISOString(),
        })
        .eq('commande_id', orderId);
    } catch {
      // table optionnelle
    }
  }

  return {
    success: true,
    message: refund
      ? `Commande annulée et remboursement de ${refundAmount.toFixed(2)}€ effectué`
      : 'Commande annulée',
    order_id: orderId,
    refund: refund
      ? { id: refund.id, amount: refundAmount, status: refund.status }
      : null,
  };
}

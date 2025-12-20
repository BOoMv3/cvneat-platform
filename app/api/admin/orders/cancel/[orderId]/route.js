import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Créer un client admin pour bypasser RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fonction pour vérifier le token et le rôle admin
const verifyAdminToken = async (request) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Non autorisé', status: 401 };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { error: 'Token invalide', status: 401 };
  }

  // Vérifier le rôle admin
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Accès refusé - Admin requis', status: 403 };
  }

  return { userId: user.id };
};

// POST /api/admin/orders/cancel/[orderId] - Annuler une commande spécifique et rembourser
export async function POST(request, { params }) {
  try {
    // Vérifier l'authentification admin
    const auth = await verifyAdminToken(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID de commande requis' },
        { status: 400 }
      );
    }

    // Récupérer la commande
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier si la commande est déjà annulée
    if (order.statut === 'annulee') {
      return NextResponse.json({
        success: true,
        message: 'Cette commande est déjà annulée',
        order_id: orderId,
        status: order.statut,
        payment_status: order.payment_status
      });
    }

    // Calculer le montant à rembourser (total + frais de livraison)
    const deliveryFee = parseFloat(order.frais_livraison || 0);
    const orderTotal = parseFloat(order.total || 0);
    const refundAmount = orderTotal + deliveryFee;

    // Vérifier si la commande a besoin d'un remboursement
    const needsRefund = 
      order.payment_status === 'paid' || order.payment_status === 'succeeded' &&
      order.stripe_payment_intent_id && 
      refundAmount > 0;

    let refund = null;
    if (needsRefund) {
      try {
        // Créer le remboursement Stripe
        refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent_id,
          amount: Math.round(refundAmount * 100), // Stripe utilise les centimes
          reason: 'requested_by_customer',
          metadata: {
            order_id: orderId,
            cancellation_reason: 'Commande annulée par l\'admin - Client peut refaire la commande',
            admin_action: 'cancel_specific_order'
          }
        });

        console.log(`✅ Remboursement créé pour commande ${orderId}: ${refund.id}`);

        // Créer une notification pour le client
        try {
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: order.user_id,
              type: 'order_cancelled_refunded',
              title: 'Commande annulée et remboursée',
              message: `Votre commande #${orderId.slice(0, 8)} a été annulée. Un remboursement de ${refundAmount.toFixed(2)}€ sera visible sur votre compte dans 2-5 jours ouvrables. Vous pouvez refaire votre commande.`,
              data: {
                order_id: orderId,
                refund_id: refund.id,
                refund_amount: refundAmount,
                reason: 'Commande annulée par l\'admin - Vous pouvez refaire la commande'
              },
              read: false,
              created_at: new Date().toISOString()
            });
        } catch (notificationError) {
          console.warn(`⚠️ Erreur création notification pour commande ${orderId}:`, notificationError);
        }

      } catch (stripeError) {
        console.error(`❌ Erreur remboursement Stripe pour commande ${orderId}:`, stripeError);
        return NextResponse.json({
          error: 'Erreur lors du remboursement Stripe',
          details: stripeError.message,
          order_id: orderId
        }, { status: 500 });
      }
    }

    // Mettre à jour la commande
    const updatePayload = {
      statut: 'annulee',
      cancellation_reason: 'Commande annulée par l\'admin - Client peut refaire la commande',
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
      .eq('id', orderId);

    if (updateError) {
      console.error(`⚠️ Erreur mise à jour commande ${orderId}:`, updateError);
      return NextResponse.json({
        error: 'Erreur lors de la mise à jour de la commande',
        details: updateError.message
      }, { status: 500 });
    }

    // Mettre à jour le statut de paiement si la table paiements existe
    if (refund) {
      try {
        await supabaseAdmin
          .from('paiements')
          .update({
            status: 'rembourse',
            refund_id: refund.id,
            refunded_at: new Date().toISOString()
          })
          .eq('commande_id', orderId);
      } catch (paymentError) {
        // La table paiements peut ne pas exister, ce n'est pas critique
        console.warn(`⚠️ Table paiements peut ne pas exister pour commande ${orderId}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: refund 
        ? `Commande annulée et remboursement de ${refundAmount.toFixed(2)}€ effectué avec succès`
        : 'Commande annulée avec succès',
      order_id: orderId,
      refund: refund ? {
        id: refund.id,
        amount: refundAmount,
        status: refund.status
      } : null
    });

  } catch (error) {
    console.error('Erreur API cancel order:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'annulation de la commande', details: error.message },
      { status: 500 }
    );
  }
}


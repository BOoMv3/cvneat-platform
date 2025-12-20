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

// POST /api/admin/orders/cancel-pending - Annuler toutes les commandes en attente et rembourser
export async function POST(request) {
  try {
    // Vérifier l'authentification admin
    const auth = await verifyAdminToken(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Récupérer toutes les commandes en attente avec paiement payé
    const { data: pendingOrders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('statut', 'en_attente')
      .in('payment_status', ['paid', 'succeeded'])
      .not('stripe_payment_intent_id', 'is', null);

    if (ordersError) {
      console.error('Erreur récupération commandes:', ordersError);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des commandes' },
        { status: 500 }
      );
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucune commande en attente à annuler',
        cancelled: 0,
        refunded: 0,
        errors: []
      });
    }

    console.log(`📦 ${pendingOrders.length} commande(s) en attente trouvée(s)`);

    const results = {
      cancelled: 0,
      refunded: 0,
      errors: []
    };

    // Traiter chaque commande
    for (const order of pendingOrders) {
      try {
        // Calculer le montant à rembourser (total + frais de livraison)
        const deliveryFee = parseFloat(order.frais_livraison || 0);
        const orderTotal = parseFloat(order.total || 0);
        const refundAmount = orderTotal + deliveryFee;

        // Vérifier si la commande a besoin d'un remboursement
        const needsRefund = order.stripe_payment_intent_id && refundAmount > 0;

        let refund = null;
        if (needsRefund) {
          try {
            // Créer le remboursement Stripe
            refund = await stripe.refunds.create({
              payment_intent: order.stripe_payment_intent_id,
              amount: Math.round(refundAmount * 100), // Stripe utilise les centimes
              reason: 'requested_by_customer',
              metadata: {
                order_id: order.id,
                cancellation_reason: 'Commande en attente annulée par l\'admin - Client peut refaire la commande',
                admin_action: 'cancel_pending_orders'
              }
            });

            console.log(`✅ Remboursement créé pour commande ${order.id}: ${refund.id}`);
            results.refunded++;

            // Créer une notification pour le client
            try {
              await supabaseAdmin
                .from('notifications')
                .insert({
                  user_id: order.user_id,
                  type: 'order_cancelled_refunded',
                  title: 'Commande annulée et remboursée',
                  message: `Votre commande #${order.id.slice(0, 8)} a été annulée. Un remboursement de ${refundAmount.toFixed(2)}€ sera visible sur votre compte dans 2-5 jours ouvrables. Vous pouvez refaire votre commande.`,
                  data: {
                    order_id: order.id,
                    refund_id: refund.id,
                    refund_amount: refundAmount,
                    reason: 'Commande en attente annulée - Vous pouvez refaire la commande'
                  },
                  read: false,
                  created_at: new Date().toISOString()
                });
            } catch (notificationError) {
              console.warn(`⚠️ Erreur création notification pour commande ${order.id}:`, notificationError);
            }

          } catch (stripeError) {
            console.error(`❌ Erreur remboursement Stripe pour commande ${order.id}:`, stripeError);
            results.errors.push({
              order_id: order.id,
              error: `Erreur Stripe: ${stripeError.message}`
            });
          }
        }

        // Mettre à jour la commande
        const updatePayload = {
          statut: 'annulee',
          cancellation_reason: 'Commande en attente annulée par l\'admin - Client peut refaire la commande',
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
          .eq('id', order.id);

        if (updateError) {
          console.error(`⚠️ Erreur mise à jour commande ${order.id}:`, updateError);
          results.errors.push({
            order_id: order.id,
            error: `Erreur mise à jour: ${updateError.message}`
          });
        } else {
          results.cancelled++;
          console.log(`✅ Commande ${order.id} annulée`);
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
              .eq('commande_id', order.id);
          } catch (paymentError) {
            // La table paiements peut ne pas exister, ce n'est pas critique
            console.warn(`⚠️ Table paiements peut ne pas exister pour commande ${order.id}`);
          }
        }

      } catch (error) {
        console.error(`❌ Erreur traitement commande ${order.id}:`, error);
        results.errors.push({
          order_id: order.id,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Traitement terminé: ${results.cancelled} commande(s) annulée(s), ${results.refunded} remboursement(s) effectué(s)`,
      cancelled: results.cancelled,
      refunded: results.refunded,
      total: pendingOrders.length,
      errors: results.errors
    });

  } catch (error) {
    console.error('Erreur API cancel-pending:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'annulation des commandes' },
      { status: 500 }
    );
  }
}


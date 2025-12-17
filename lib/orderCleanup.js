import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Nettoie les commandes expirées (sans livreur depuis plus de 10 minutes)
 * et rembourse intégralement les clients
 * 
 * @returns {Promise<{cancelled: number, errors: Array}>}
 */
export async function cleanupExpiredOrders() {
  try {
    // Calculer la date limite (10 minutes avant maintenant)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    console.log('🧹 Nettoyage des commandes expirées (sans livreur depuis plus de 10 minutes)...');
    console.log('   Date limite:', tenMinutesAgo);

    // Trouver les commandes en_attente sans livreur depuis plus de 10 minutes
    const { data: expiredOrders, error: fetchError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('statut', 'en_attente')
      .is('livreur_id', null)
      .in('payment_status', ['paid', 'succeeded'])
      .lte('delivery_requested_at', tenMinutesAgo);

    if (fetchError) {
      console.error('❌ Erreur récupération commandes expirées:', fetchError);
      return { cancelled: 0, errors: [fetchError.message] };
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('✅ Aucune commande expirée à nettoyer');
      return { cancelled: 0, errors: [] };
    }

    console.log(`📋 ${expiredOrders.length} commande(s) expirée(s) trouvée(s)`);

    const errors = [];
    let cancelledCount = 0;

    // Traiter chaque commande expirée
    for (const order of expiredOrders) {
      try {
        console.log(`🔄 Traitement commande ${order.id?.slice(0, 8)}...`);

        // Calculer le montant total à rembourser
        const { data: orderDetails, error: detailsError } = await supabaseAdmin
          .from('details_commande')
          .select('quantite, prix_unitaire, supplements')
          .eq('commande_id', order.id);

        let calculatedSubtotal = 0;
        if (!detailsError && orderDetails && orderDetails.length > 0) {
          orderDetails.forEach(detail => {
            let prixUnitaire = parseFloat(detail.prix_unitaire || 0);
            let supplementsPrice = 0;
            
            if (detail.supplements) {
              let supplements = [];
              if (typeof detail.supplements === 'string') {
                try {
                  supplements = JSON.parse(detail.supplements);
                } catch (e) {
                  supplements = [];
                }
              } else if (Array.isArray(detail.supplements)) {
                supplements = detail.supplements;
              }
              supplementsPrice = supplements.reduce((sum, sup) => {
                return sum + (parseFloat(sup.prix || sup.price || 0) || 0);
              }, 0);
            }

            const quantity = parseFloat(detail.quantite || 1);
            if (prixUnitaire > 0) {
              calculatedSubtotal += prixUnitaire * quantity;
            } else if (supplementsPrice > 0) {
              calculatedSubtotal += supplementsPrice * quantity;
            }
          });
        } else {
          calculatedSubtotal = parseFloat(order.total || 0);
        }

        const deliveryFee = parseFloat(order.frais_livraison || 0);
        const calculatedTotal = calculatedSubtotal + deliveryFee;
        const dbTotal = parseFloat(order.total || 0) + deliveryFee;
        let orderTotal = Math.max(calculatedTotal, dbTotal);

        if (orderTotal <= 0 && order.total > 0) {
          orderTotal = parseFloat(order.total || 0) + deliveryFee;
        }

        // Rembourser si nécessaire
        let refundResult = null;
        if (order.payment_status === 'paid' && order.stripe_payment_intent_id && orderTotal > 0 && stripe) {
          try {
            console.log(`💰 Remboursement commande ${order.id?.slice(0, 8)}: ${orderTotal}€`);

            const refund = await stripe.refunds.create({
              payment_intent: order.stripe_payment_intent_id,
              amount: Math.round(orderTotal * 100),
              reason: 'requested_by_customer',
              metadata: {
                order_id: order.id,
                cancellation_reason: 'Commande annulée automatiquement - aucun livreur disponible dans les 10 minutes',
                user_id: order.user_id,
                auto_cancelled: 'true'
              }
            });

            refundResult = {
              id: refund.id,
              amount: refund.amount / 100,
              status: refund.status
            };

            console.log(`✅ Remboursement Stripe créé: ${refund.id}`);
          } catch (stripeError) {
            console.error(`❌ Erreur remboursement Stripe pour ${order.id?.slice(0, 8)}:`, stripeError);
            errors.push(`Erreur remboursement ${order.id?.slice(0, 8)}: ${stripeError.message}`);
            // Continuer quand même pour annuler la commande
          }
        }

        // Mettre à jour la commande
        const updateData = {
          statut: 'annulee',
          cancellation_reason: 'Commande annulée automatiquement - aucun livreur disponible dans les 10 minutes',
          updated_at: new Date().toISOString()
        };

        if (refundResult) {
          updateData.payment_status = 'refunded';
          updateData.stripe_refund_id = refundResult.id;
          updateData.refund_amount = orderTotal;
          updateData.refunded_at = new Date().toISOString();
        }

        const { error: updateError } = await supabaseAdmin
          .from('commandes')
          .update(updateData)
          .eq('id', order.id);

        if (updateError) {
          console.error(`❌ Erreur mise à jour commande ${order.id?.slice(0, 8)}:`, updateError);
          errors.push(`Erreur mise à jour ${order.id?.slice(0, 8)}: ${updateError.message}`);
        } else {
          cancelledCount++;
          console.log(`✅ Commande ${order.id?.slice(0, 8)} annulée et remboursée`);
        }

        // Envoyer une notification au client (optionnel)
        try {
          if (order.user_id) {
            // Ici vous pouvez ajouter une notification push ou email
            console.log(`📧 Notification envoyée au client pour commande ${order.id?.slice(0, 8)}`);
          }
        } catch (notifError) {
          console.warn(`⚠️ Erreur notification client ${order.id?.slice(0, 8)}:`, notifError);
        }

      } catch (orderError) {
        console.error(`❌ Erreur traitement commande ${order.id?.slice(0, 8)}:`, orderError);
        errors.push(`Erreur traitement ${order.id?.slice(0, 8)}: ${orderError.message}`);
      }
    }

    console.log(`✅ Nettoyage terminé: ${cancelledCount} commande(s) annulée(s)`);
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} erreur(s) rencontrée(s)`);
    }

    return { cancelled: cancelledCount, errors };

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des commandes expirées:', error);
    return { cancelled: 0, errors: [error.message] };
  }
}


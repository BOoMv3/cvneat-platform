import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { supabase as supabasePublic, supabaseAdmin } from '../../../../lib/supabase';
import { formatReceiptText } from '../../../../lib/receipt/formatReceiptText';
import { notifyDeliverySubscribers } from '../../../../lib/pushNotifications';
// SSE resto désactivé dans ce workflow: on notifie le resto uniquement après acceptation livreur.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const isMissingColumnError = (err, column) => {
  const msg = (err?.message || '').toString().toLowerCase();
  return msg.includes('column') && msg.includes(column.toLowerCase()) && msg.includes('does not exist');
};

async function tryUpdateStripeFeeFields(db, orderId, update) {
  try {
    const { error } = await db.from('commandes').update(update).eq('id', orderId);
    if (error) {
      // Si la migration n'est pas appliquée, ne pas casser le webhook
      if (
        isMissingColumnError(error, 'stripe_fee_amount') ||
        isMissingColumnError(error, 'stripe_net_amount') ||
        isMissingColumnError(error, 'stripe_available_on') ||
        isMissingColumnError(error, 'stripe_balance_transaction_id') ||
        isMissingColumnError(error, 'stripe_charge_id')
      ) {
        console.warn('⚠️ Colonnes Stripe fee/net absentes sur commandes (migration non appliquée ?).');
        return;
      }
      console.warn('⚠️ Update Stripe fee/net échoué:', error?.message || error);
    }
  } catch (e) {
    console.warn('⚠️ Exception update Stripe fee/net:', e?.message || e);
  }
}

async function getStripeFinancialsFromPaymentIntent(paymentIntentId) {
  // Récupérer PI + latest_charge + balance_transaction pour avoir fee/net exacts
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge.balance_transaction'],
  });

  const latestCharge = pi?.latest_charge || null;
  if (!latestCharge) return null;

  // latest_charge peut être un id string ou un objet
  const charge =
    typeof latestCharge === 'string' ? await stripe.charges.retrieve(latestCharge, { expand: ['balance_transaction'] }) : latestCharge;

  const btRaw = charge?.balance_transaction || null;
  const bt =
    !btRaw
      ? null
      : typeof btRaw === 'string'
        ? await stripe.balanceTransactions.retrieve(btRaw)
        : btRaw;

  if (!bt) return null;

  return {
    stripe_fee_amount: typeof bt.fee === 'number' ? bt.fee / 100 : null,
    stripe_net_amount: typeof bt.net === 'number' ? bt.net / 100 : null,
    stripe_currency: bt.currency || null,
    stripe_available_on: typeof bt.available_on === 'number' ? new Date(bt.available_on * 1000).toISOString() : null,
    stripe_balance_transaction_id: bt.id || null,
    stripe_charge_id: charge?.id || null,
  };
}

// POST /api/stripe/webhook - Webhook Stripe pour les remboursements
export async function POST(request) {
  try {
    // Utiliser l'origin du webhook pour appeler nos routes internes de manière fiable
    const origin = new URL(request.url).origin;

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
        await handlePaymentSucceeded(event.data.object, { origin });
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object, { origin });
        break;

      case 'payment_intent.created':
        // Log pour tracking - les PaymentIntents incomplets sont normaux
        console.log('📝 PaymentIntent créé:', event.data.object.id, 'Statut:', event.data.object.status);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object, { origin });
        break;

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object, { origin });
        break;

      case 'refund.created':
        await handleRefundCreated(event.data.object, { origin });
        break;

      case 'refund.updated':
        await handleRefundUpdated(event.data.object, { origin });
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
async function handlePaymentSucceeded(paymentIntent, { origin } = {}) {
  console.log('✅ Paiement réussi:', paymentIntent.id);
  
  try {
    // IMPORTANT: ce webhook doit tourner avec service role (RLS), sinon on rate des champs (ex: restaurants.user_id)
    const db = supabaseAdmin || supabasePublic;
    if (!supabaseAdmin) {
      console.warn('⚠️ supabaseAdmin indisponible (SUPABASE_SERVICE_ROLE_KEY manquant). Le webhook peut échouer avec RLS.');
    }

    // Récupérer les informations complètes de la commande
    // IMPORTANT: on tente d'abord via stripe_payment_intent_id, puis fallback via metadata.order_id
    // car le checkout peut créer la commande AVANT d'avoir le PaymentIntentId.
    let order = null;
    let orderError = null;

    const byPi = await db
      .from('commandes')
      .select('id, order_number, customer_id, restaurant_id, total, frais_livraison, discount_amount, stripe_payment_intent_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle();
    order = byPi.data || null;
    orderError = byPi.error || null;

    if (!order) {
      const metaOrderId = paymentIntent?.metadata?.order_id || paymentIntent?.metadata?.orderId || null;
      if (metaOrderId) {
        console.log('🔎 Webhook: fallback lookup commande via metadata.order_id:', metaOrderId);
        const byMeta = await db
          .from('commandes')
          .select('id, order_number, customer_id, restaurant_id, total, frais_livraison, discount_amount, stripe_payment_intent_id')
          .eq('id', metaOrderId)
          .maybeSingle();
        order = byMeta.data || null;
        orderError = byMeta.error || null;

        // Rattacher le paymentIntentId à la commande si manquant (important pour refunds / debug)
        if (order?.id && !order.stripe_payment_intent_id) {
          try {
            const { error: linkErr } = await db
              .from('commandes')
              .update({ stripe_payment_intent_id: paymentIntent.id, updated_at: new Date().toISOString() })
              .eq('id', order.id);
            if (linkErr) {
              console.warn('⚠️ Webhook: impossible de lier stripe_payment_intent_id à la commande:', linkErr.message);
            } else {
              console.log('🔗 Webhook: stripe_payment_intent_id relié à la commande:', order.id);
            }
          } catch (e) {
            console.warn('⚠️ Webhook: exception liaison stripe_payment_intent_id:', e?.message || e);
          }
        }
      }
    }

    if (orderError || !order) {
      console.warn('⚠️ Commande non trouvée pour payment intent:', paymentIntent.id, {
        metadata_order_id: paymentIntent?.metadata?.order_id || null,
        err: orderError?.message || null,
      });
      return;
    }

    // If already paid, do not re-enqueue print jobs (avoids duplicates on webhook retries)
    const current = await db
      .from('commandes')
      .select('payment_status')
      .eq('id', order.id)
      .maybeSingle();
    const wasPaidBefore = (current?.data?.payment_status || '').toString().trim().toLowerCase() === 'paid';

    // Mettre à jour le statut de la commande + synchroniser le montant réellement payé (Stripe)
    const paidAmount = typeof paymentIntent.amount === 'number' ? paymentIntent.amount / 100 : null;
    const knownPlatformFee = 0.49;
    const subtotalArticles = parseFloat(order.total || 0) || 0;
    const discount = parseFloat(order.discount_amount || 0) || 0;
    const subtotalAfterDiscount = Math.max(0, Math.round((subtotalArticles - discount) * 100) / 100);
    let computedDeliveryFee = null;
    if (paidAmount !== null) {
      const feesTotal = Math.max(0, Math.round((paidAmount - subtotalAfterDiscount) * 100) / 100);
      computedDeliveryFee = Math.max(0, Math.round((feesTotal - knownPlatformFee) * 100) / 100);
    }

    const { error: updateError } = await db
      .from('commandes')
      .update({
        payment_status: 'paid',
        ...(paidAmount !== null ? { total_paid: paidAmount } : {}),
        ...(computedDeliveryFee !== null ? { frais_livraison: computedDeliveryFee } : {}),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour commande:', updateError);
    } else {
      console.log('✅ Statut de commande mis à jour:', order.order_number);

      // Enqueue receipt print job for the restaurant (only on first transition to paid)
      if (!wasPaidBefore && order.restaurant_id) {
        try {
          const { data: fullOrder } = await db
            .from('commandes')
            .select(
              'id, order_number, restaurant_id, created_at, total, frais_livraison, discount_amount, total_paid, customer_first_name, customer_last_name, customer_phone, customer_email, adresse_livraison, ville_livraison'
            )
            .eq('id', order.id)
            .maybeSingle();

          const { data: restaurant } = await db
            .from('restaurants')
            .select('id, nom')
            .eq('id', order.restaurant_id)
            .maybeSingle();

          const { data: details } = await db
            .from('details_commande')
            .select('id, commande_id, quantite, prix_unitaire, menus ( nom, prix )')
            .eq('commande_id', order.id);

          const items = (details || []).map((d) => ({
            id: d.id,
            quantity: d.quantite,
            price: d.prix_unitaire,
            name: d.menus?.nom || 'Article',
          }));

          const text = formatReceiptText({
            restaurant,
            order: fullOrder || order,
            items,
          });

          await db
            .from('notifications')
            .insert({
              restaurant_id: order.restaurant_id,
              type: 'print_receipt',
              message: `Commande #${order.id?.slice(0, 8)} à imprimer`,
              data: {
                template: 'receipt_v1',
                format: 'dantsu_escpos_markup',
                order_id: order.id,
                order_number: fullOrder?.order_number || null,
                text,
              },
              lu: false,
            })
            .select()
            .maybeSingle();
        } catch (e) {
          console.warn('⚠️ Enqueue print_receipt échoué (non bloquant):', e?.message || e);
        }
      }

      // Stocker les vrais frais Stripe (fee/net/available_on) pour le suivi comptable.
      // Non bloquant si la migration n'est pas appliquée.
      try {
        const fin = await getStripeFinancialsFromPaymentIntent(paymentIntent.id);
        if (fin) {
          await tryUpdateStripeFeeFields(db, order.id, {
            ...fin,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn('⚠️ Impossible de récupérer les frais Stripe (non bloquant):', e?.message || e);
      }
      
      // IMPORTANT: Envoyer la notification SSE uniquement après confirmation du paiement via webhook
      if (order.restaurant_id) {
        try {
          const notificationTotal = (parseFloat(order.total || 0) + parseFloat(order.frais_livraison || 0)).toFixed(2);
          
          // NOUVEAU WORKFLOW: d'abord notifier les livreurs uniquement.
          // Le restaurant sera notifié uniquement quand un livreur accepte la commande.
          // Notification push pour les livreurs (commande disponible)
          try {
            const pushBase = origin || process.env.NEXT_PUBLIC_BASE_URL || 'https://cvneat.fr';
            const pushResponse = await fetch(`${pushBase}/api/notifications/send-push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                role: 'delivery',
                title: 'Nouvelle commande disponible 🚚',
                body: `Commande #${order.id?.slice(0, 8)} - ${notificationTotal}€`,
                data: {
                  type: 'new_order_available',
                  orderId: order.id,
                  url: '/delivery/dashboard'
                }
              })
            });
            
            if (pushResponse.ok) {
              const result = await pushResponse.json();
              console.log('✅ Notification push livreurs:', result.sent, '/', result.total, result.message || '');
              if (result.sent === 0 && result.total === 0) {
                console.warn('⚠️ Aucun token livreur: vérifier rôles (delivery/livreur) et device_tokens.');
              }
            } else {
              const errText = await pushResponse.text();
              console.warn('⚠️ send-push non OK:', pushResponse.status, errText);
            }
          } catch (pushError) {
            console.warn('⚠️ Erreur envoi notification push livreurs:', pushError);
          }
          // Web Push (livreurs dashboard web) — en plus de device_tokens (app mobile)
          try {
            const db = supabaseAdmin || supabasePublic;
            if (db) {
              await notifyDeliverySubscribers(db, {
                title: 'Nouvelle commande disponible 🚚',
                body: `Commande #${order.id?.slice(0, 8)} - ${notificationTotal}€`,
                data: { type: 'new_order_available', orderId: order.id, url: '/delivery/dashboard' }
              });
            }
          } catch (webPushErr) {
            console.warn('⚠️ Erreur Web Push livreurs:', webPushErr?.message || webPushErr);
          }
          console.log('💰 Montant notification (avec frais):', notificationTotal, '€');
        } catch (broadcastError) {
          console.warn('⚠️ Erreur broadcasting SSE:', broadcastError);
          // Ne pas faire échouer le traitement du webhook si le broadcast échoue
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur traitement paiement réussi:', error);
  }
}

// Gestion du paiement échoué
async function handlePaymentFailed(paymentIntent, { origin } = {}) {
  console.log('❌ Paiement échoué:', paymentIntent.id);
  
  try {
    const db = supabaseAdmin || supabasePublic;
    const { data: order, error: orderError } = await db
      .from('commandes')
      .select('id, order_number, customer_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (orderError || !order) {
      console.warn('⚠️ Commande non trouvée pour le payment intent:', paymentIntent.id);
      return;
    }

    // Mettre à jour le statut de la commande - DÉSACTIVÉ POUR DEBUG
    console.log('⚠️ STRIPE WEBHOOK DÉSACTIVÉ - Ne pas annuler la commande pour paiement échoué');
    
    // const { error: updateError } = await supabase
    //   .from('commandes')
    //   .update({
    //     payment_status: 'failed',
    //     statut: 'annulee',
    //     updated_at: new Date().toISOString()
    //   })
    //   .eq('id', order.id);

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

    // Mettre à jour le statut de la commande - DÉSACTIVÉ POUR DEBUG
    console.log('⚠️ STRIPE WEBHOOK DÉSACTIVÉ - Ne pas annuler la commande pour paiement annulé');
    
    // const { error: updateError } = await supabase
    //   .from('commandes')
    //   .update({
    //     payment_status: 'cancelled',
    //     statut: 'annulee',
    //     updated_at: new Date().toISOString()
    //   })
    //   .eq('id', order.id);

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

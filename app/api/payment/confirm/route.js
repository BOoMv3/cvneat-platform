import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '../../../../lib/supabase';
import { formatReceiptText } from '../../../../lib/receipt/formatReceiptText';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const isMissingColumnError = (err, column) => {
  const msg = (err?.message || '').toString().toLowerCase();
  return msg.includes('column') && msg.includes(column.toLowerCase()) && msg.includes('does not exist');
};

async function tryUpdateStripeFeeFields(orderId, update) {
  try {
    const { error } = await supabaseAdmin.from('commandes').update(update).eq('id', orderId);
    if (error) {
      if (
        isMissingColumnError(error, 'stripe_fee_amount') ||
        isMissingColumnError(error, 'stripe_net_amount') ||
        isMissingColumnError(error, 'stripe_available_on') ||
        isMissingColumnError(error, 'stripe_balance_transaction_id') ||
        isMissingColumnError(error, 'stripe_charge_id')
      ) {
        return; // migration non appliquée
      }
      console.warn('⚠️ Update Stripe fee/net échoué:', error?.message || error);
    }
  } catch (e) {
    console.warn('⚠️ Exception update Stripe fee/net:', e?.message || e);
  }
}

async function getStripeFinancialsFromPaymentIntent(paymentIntentId) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge.balance_transaction'],
  });
  const latestCharge = pi?.latest_charge || null;
  if (!latestCharge) return null;
  const charge =
    typeof latestCharge === 'string'
      ? await stripe.charges.retrieve(latestCharge, { expand: ['balance_transaction'] })
      : latestCharge;
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Email',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json().catch(() => ({}));
    const paymentIntentId = body?.paymentIntentId;
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId requis' }, { status: 400, headers: corsHeaders });
    }

    // Récupérer le PaymentIntent côté Stripe (source de vérité)
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent) {
      return NextResponse.json({ error: 'PaymentIntent introuvable' }, { status: 404, headers: corsHeaders });
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Paiement non confirmé (status=${paymentIntent.status})` },
        { status: 400, headers: corsHeaders }
      );
    }

    const orderId = paymentIntent?.metadata?.order_id || paymentIntent?.metadata?.orderId || null;
    if (!orderId) {
      return NextResponse.json(
        { error: "metadata.order_id manquant sur le PaymentIntent (impossible de relier la commande)" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Charger la commande (pour calculs + notification + fidélité)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('id, order_number, user_id, restaurant_id, total, frais_livraison, discount_amount, stripe_payment_intent_id, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande introuvable', details: orderError?.message },
        { status: 404, headers: corsHeaders }
      );
    }

    const wasPaidBefore = (order.payment_status || '').toString().trim().toLowerCase() === 'paid';

    // Synchroniser montants depuis Stripe (comme dans le webhook)
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

    // Recalculer la commission livraison CVN'EAT (pour garder cohérence gains livreur / stats / admin)
    // Règle: si frais_livraison <= 2.50€ → commission = 0€ ; sinon commission = 10% des frais de livraison.
    let deliveryCommissionCvneat = null;
    if (computedDeliveryFee !== null) {
      const DELIVERY_BASE_FEE = 2.5;
      const DELIVERY_COMMISSION_RATE = 0.1;
      deliveryCommissionCvneat =
        computedDeliveryFee > DELIVERY_BASE_FEE
          ? Math.round(computedDeliveryFee * DELIVERY_COMMISSION_RATE * 100) / 100
          : 0;
    }

    // Mettre à jour la commande: paid + lier le PaymentIntentId (si besoin)
    const updatePayload = {
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
      ...(paidAmount !== null ? { total_paid: paidAmount } : {}),
      ...(computedDeliveryFee !== null ? { frais_livraison: computedDeliveryFee } : {}),
      ...(deliveryCommissionCvneat !== null
        ? { delivery_commission_cvneat: deliveryCommissionCvneat }
        : {}),
      ...(order.stripe_payment_intent_id ? {} : { stripe_payment_intent_id: paymentIntent.id }),
    };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('commandes')
      .update(updatePayload)
      .eq('id', order.id)
      .select('id, restaurant_id, total, frais_livraison, discount_amount, payment_status')
      .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        { error: 'Erreur mise à jour commande', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Si aucune ligne n'a été modifiée/renvoyée (race condition), on s'arrête sans notifier
    if (!updated) {
      return NextResponse.json(
        { success: true, orderId: order.id, alreadyPaid: wasPaidBefore },
        { headers: corsHeaders }
      );
    }

    // Stocker les vrais frais Stripe (non bloquant si la migration n'est pas appliquée)
    try {
      const fin = await getStripeFinancialsFromPaymentIntent(paymentIntent.id);
      if (fin) {
        await tryUpdateStripeFeeFields(order.id, {
          ...fin,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      // non bloquant
    }

    // Notifications:
    // NOUVEAU WORKFLOW: notifier les livreurs uniquement au moment où la commande passe réellement à "paid".
    // Si elle était déjà "paid" (ex: /api/orders/[id]), ne pas renvoyer de push (évite doublons).
    const isPaidNow = (updated.payment_status || '').toString().trim().toLowerCase() === 'paid';
    const transitionedToPaid = isPaidNow && !wasPaidBefore;
    if (transitionedToPaid) {
      const orderUserId = order?.user_id;
      const orderAmount = paidAmount ?? (parseFloat(order?.total || 0) + parseFloat(order?.frais_livraison || 0));
      const pointsUsed = parseInt(paymentIntent?.metadata?.points_used || '0', 10) || 0;

      // Déduire les points utilisés (non bloquant)
      if (orderUserId && pointsUsed > 0) {
        (async () => {
          try {
            const { data: u } = await supabaseAdmin.from('users').select('points_fidelite').eq('id', orderUserId).single();
            const current = parseInt(u?.points_fidelite || 0, 10) || 0;
            if (current >= pointsUsed) {
              await supabaseAdmin.from('users').update({ points_fidelite: Math.max(0, current - pointsUsed) }).eq('id', orderUserId);
              await supabaseAdmin.from('loyalty_history').insert({
                user_id: orderUserId,
                order_id: orderId,
                points_spent: pointsUsed,
                reason: 'Commande',
                description: `Utilisation de ${pointsUsed} pts pour la commande`,
              }).catch(() => {});
            }
          } catch (e) { /* non bloquant */ }
        })();
      }

      // Créditer les points de fidélité (non bloquant)
      if (orderUserId && orderAmount > 0) {
        (async () => {
          try {
            const pointsEarned = Math.floor(orderAmount); // 1 pt / €
            const { data: u } = await supabaseAdmin.from('users').select('points_fidelite').eq('id', orderUserId).single();
            const current = parseInt(u?.points_fidelite || 0, 10) || 0;
            await supabaseAdmin.from('users').update({ points_fidelite: current + pointsEarned }).eq('id', orderUserId);
            await supabaseAdmin.from('loyalty_history').insert({
              user_id: orderUserId,
              order_id: orderId,
              points_earned: pointsEarned,
              reason: 'Commande',
              description: `Commande - ${orderAmount.toFixed(2)}€`,
            }).catch(() => {});
          } catch (e) {
            /* non bloquant */
          }
        })();
      }
      try {
        const origin = new URL(request.url).origin;
        const notificationTotal = (
          parseFloat(updated.total || 0) + parseFloat(updated.frais_livraison || 0)
        ).toFixed(2);

        if (updated.restaurant_id) {
          // Enqueue a receipt print job for the restaurant (non-bloquant)
          try {
            const { data: fullOrder } = await supabaseAdmin
              .from('commandes')
              .select(
                'id, order_number, restaurant_id, created_at, total, frais_livraison, discount_amount, total_paid, customer_first_name, customer_last_name, customer_phone, customer_email, adresse_livraison, ville_livraison'
              )
              .eq('id', updated.id)
              .maybeSingle();

            const { data: restaurant } = await supabaseAdmin
              .from('restaurants')
              .select('id, nom')
              .eq('id', updated.restaurant_id)
              .maybeSingle();

            const { data: details } = await supabaseAdmin
              .from('details_commande')
              .select('id, commande_id, quantite, prix_unitaire, menus ( nom, prix )')
              .eq('commande_id', updated.id);

            const items = (details || []).map((d) => ({
              id: d.id,
              quantity: d.quantite,
              price: d.prix_unitaire,
              name: d.menus?.nom || 'Article',
            }));

            const text = formatReceiptText({
              restaurant,
              order: fullOrder || updated,
              items,
            });

            await supabaseAdmin
              .from('notifications')
              .insert({
                restaurant_id: updated.restaurant_id,
                type: 'print_receipt',
                message: `Commande #${updated.id?.slice(0, 8)} à imprimer`,
                data: {
                  template: 'receipt_v1',
                  format: 'dantsu_escpos_markup',
                  order_id: updated.id,
                  order_number: fullOrder?.order_number || null,
                  text,
                },
                lu: false,
              })
              .select()
              .maybeSingle();
          } catch {
            // non bloquant
          }

          await fetch(`${origin}/api/notifications/send-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'delivery',
              title: 'Nouvelle commande disponible 🚚',
              body: `Commande #${updated.id?.slice(0, 8)} - ${notificationTotal}€`,
              data: { type: 'new_order_available', orderId: updated.id, url: '/delivery/dashboard' },
            }),
          }).catch(() => {});
        }
      } catch {
        // non bloquant
      }
    }

    return NextResponse.json({ success: true, orderId: order.id }, { headers: corsHeaders });
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e?.message },
      { status: 500, headers: corsHeaders }
    );
  }
}



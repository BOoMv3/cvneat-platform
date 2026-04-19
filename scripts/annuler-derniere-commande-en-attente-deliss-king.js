/**
 * Annule et rembourse la dernière commande en attente pour Deliss King.
 * Usage: node scripts/annuler-derniere-commande-en-attente-deliss-king.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables Supabase manquantes');
  process.exit(1);
}
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY manquante');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey);

async function refundableCentsForPaymentIntent(piId) {
  const pi = await stripe.paymentIntents.retrieve(piId);
  const chId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
  if (!chId) return 0;
  const ch = await stripe.charges.retrieve(chId);
  return Math.max(0, (ch.amount || 0) - (ch.amount_refunded || 0));
}

async function main() {
  let { data: restaurants, error: rErr } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom')
    .ilike('nom', '%deliss%king%');
  if (!restaurants?.length) {
    ({ data: restaurants, error: rErr } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .ilike('nom', '%deliss%'));
  }
  if (!restaurants?.length) {
    ({ data: restaurants, error: rErr } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .ilike('nom', '%déliss%'));
  }

  if (rErr || !restaurants?.length) {
    console.error('❌ Restaurant Deliss King introuvable:', rErr?.message || '');
    process.exit(1);
  }

  const restaurant = restaurants[0];
  if (restaurants.length > 1) {
    console.log('⚠️ Plusieurs correspondances, utilisation du premier:', restaurants.map((x) => x.nom).join(', '));
  }
  console.log('✅ Restaurant:', restaurant.nom, restaurant.id);

  const { data: orders, error: oErr } = await supabaseAdmin
    .from('commandes')
    .select('id, created_at, statut, payment_status, total, frais_livraison, stripe_payment_intent_id, user_id')
    .eq('restaurant_id', restaurant.id)
    .eq('statut', 'en_attente')
    .order('created_at', { ascending: false })
    .limit(1);

  if (oErr) {
    console.error('❌ Erreur commandes:', oErr.message);
    process.exit(1);
  }
  if (!orders?.length) {
    console.log('ℹ️ Aucune commande en_attente pour ce restaurant.');
    process.exit(0);
  }

  const order = orders[0];
  const totalAvecLivraison = parseFloat(order.total || 0) + parseFloat(order.frais_livraison || 0);
  console.log('✅ Dernière commande en attente:', order.id, '|', order.created_at, '|', totalAvecLivraison.toFixed(2), '€');

  const needsRefund =
    (order.payment_status === 'paid' || order.payment_status === 'succeeded') &&
    order.stripe_payment_intent_id &&
    totalAvecLivraison > 0;

  let refund = null;
  let refundAmountEur = 0;
  if (needsRefund) {
    const requestedCents = Math.round(totalAvecLivraison * 100);
    const maxCents = await refundableCentsForPaymentIntent(order.stripe_payment_intent_id);
    const refundCents = Math.min(requestedCents, maxCents);
    if (refundCents <= 0) {
      console.log(
        'ℹ️ Stripe: aucun centime remboursable restant sur ce paiement (déjà remboursé côté Stripe). Annulation de la commande uniquement.'
      );
    } else {
      if (refundCents < requestedCents) {
        console.log(
          `ℹ️ Remboursement partiel Stripe: ${(refundCents / 100).toFixed(2)}€ (solde restant sur la charge, la commande indiquait ${totalAvecLivraison.toFixed(2)}€).`
        );
      }
      refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: refundCents,
        reason: 'requested_by_customer',
        metadata: {
          order_id: order.id,
          admin_action: 'cancel_pending_deliss_king_script',
        },
      });
      refundAmountEur = refundCents / 100;
      console.log('✅ Remboursement Stripe:', refund.id, refund.status, refundAmountEur, '€');
    }
  } else {
    console.log('ℹ️ Pas de remboursement Stripe (non payée ou pas de PI).');
  }

  const updatePayload = {
    statut: 'annulee',
    updated_at: new Date().toISOString(),
  };
  if (refund) {
    updatePayload.payment_status = 'refunded';
    updatePayload.stripe_refund_id = refund.id;
    updatePayload.refund_amount = refundAmountEur;
    updatePayload.refunded_at = new Date().toISOString();
  }

  const { error: uErr } = await supabaseAdmin.from('commandes').update(updatePayload).eq('id', order.id);
  if (uErr) {
    console.error('❌ Mise à jour commande:', uErr.message);
    process.exit(1);
  }
  console.log('✅ Commande mise à jour: annulee');

  if (order.user_id) {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: order.user_id,
        type: 'order_cancelled_refunded',
        title: 'Commande annulée',
        message: `Votre commande #${String(order.id).slice(0, 8)} a été annulée.${refund ? ` Remboursement ${refundAmountEur.toFixed(2)}€ sous 2–5 jours ouvrables.` : ''}`,
        data: { order_id: order.id, refund_id: refund?.id || null },
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('⚠️ Notification:', e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

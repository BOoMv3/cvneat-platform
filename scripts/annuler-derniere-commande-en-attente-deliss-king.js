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

async function main() {
  const { data: restaurants, error: rErr } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom')
    .or('nom.ilike.%deliss%king%,nom.ilike.%deliss king%,nom.ilike.%déliss%king%');

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
  if (needsRefund) {
    refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: Math.round(totalAvecLivraison * 100),
      reason: 'requested_by_customer',
      metadata: {
        order_id: order.id,
        cancellation_reason: 'Commande non traitée par le restaurant — annulation admin',
        admin_action: 'cancel_pending_deliss_king_script',
      },
    });
    console.log('✅ Remboursement Stripe:', refund.id, refund.status);
  } else {
    console.log('ℹ️ Pas de remboursement Stripe (non payée ou pas de PI).');
  }

  const updatePayload = {
    statut: 'annulee',
    cancellation_reason: 'Commande en attente annulée — restaurant n’a pas accepté ni refusé (traitement admin)',
    updated_at: new Date().toISOString(),
  };
  if (refund) {
    updatePayload.payment_status = 'refunded';
    updatePayload.stripe_refund_id = refund.id;
    updatePayload.refund_amount = totalAvecLivraison;
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
        message: `Votre commande #${String(order.id).slice(0, 8)} a été annulée.${refund ? ` Remboursement ${totalAvecLivraison.toFixed(2)}€ sous 2–5 jours ouvrables.` : ''}`,
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

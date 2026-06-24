#!/usr/bin/env node
/**
 * Répare une commande : paiement Stripe réussi mais BDD encore "pending".
 *
 * Usage:
 *   node scripts/repair-stuck-stripe-payment.mjs --scan --hours 48
 *   node scripts/repair-stripe-payment.mjs --order-id <uuid> [--refund] [--notify]
 *   node scripts/repair-stuck-stripe-payment.mjs --payment-intent pi_xxx [--refund] [--notify]
 */
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const orderIdArg = getArg('--order-id');
const piArg = getArg('--payment-intent');
const hours = parseInt(getArg('--hours') || '48', 10);
const doRefund = hasFlag('--refund');
const doNotify = hasFlag('--notify');
const scanOnly = hasFlag('--scan');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!url || !key || !stripeKey) {
  console.error('Variables SUPABASE / STRIPE manquantes');
  process.exit(1);
}

const sb = createClient(url, key);
const stripe = new Stripe(stripeKey);

const PLATFORM_FEE = 0.49;

function isPaidDb(ps) {
  const s = (ps || '').toLowerCase();
  return s === 'paid' || s === 'succeeded';
}

function computeDeliveryFee(paidAmount, order) {
  const subtotal = Math.max(
    0,
    parseFloat(order.total || 0) - parseFloat(order.discount_amount || 0)
  );
  return Math.max(0, Math.round((paidAmount - subtotal - PLATFORM_FEE) * 100) / 100);
}

async function findStuck(hoursBack) {
  const since = Math.floor((Date.now() - hoursBack * 3600000) / 1000);
  const stuck = [];
  for await (const pi of stripe.paymentIntents.list({ limit: 100, created: { gte: since } })) {
    if (pi.status !== 'succeeded' || !pi.metadata?.order_id) continue;
    if ((pi.amount_refunded || 0) >= pi.amount) continue;
    const oid = pi.metadata.order_id;
    const { data: ord } = await sb
      .from('commandes')
      .select('id, payment_status, statut, customer_email, total')
      .eq('id', oid)
      .maybeSingle();
    if (!ord || !isPaidDb(ord.payment_status)) {
      stuck.push({ pi, order: ord, orderId: oid });
    }
  }
  return stuck;
}

async function linkOrderToPi(orderId, pi) {
  const paidAmount = pi.amount / 100;
  const { data: order } = await sb
    .from('commandes')
    .select('id, total, discount_amount, restaurant_id, frais_livraison')
    .eq('id', orderId)
    .single();
  const deliveryFee = computeDeliveryFee(paidAmount, order);
  const { error } = await sb
    .from('commandes')
    .update({
      payment_status: 'paid',
      stripe_payment_intent_id: pi.id,
      total_paid: paidAmount,
      frais_livraison: deliveryFee,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (error) throw new Error(error.message);
  return { paidAmount, deliveryFee, order };
}

async function refundOrder(orderId, pi) {
  const refund = await stripe.refunds.create({
    payment_intent: pi.id,
    reason: 'requested_by_customer',
    metadata: { order_id: orderId, admin_action: 'repair_stuck_stripe_payment' },
  });
  await sb
    .from('commandes')
    .update({
      statut: 'annulee',
      payment_status: 'refunded',
      stripe_refund_id: refund.id,
      refund_amount: refund.amount / 100,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  return refund;
}

async function notifyOrder(orderId, order, restaurantId) {
  const total = (parseFloat(order.total || 0) + parseFloat(order.frais_livraison || 0)).toFixed(2);
  await sb.from('notifications').insert({
    restaurant_id: restaurantId,
    type: 'print_receipt',
    message: `Commande #${orderId.slice(0, 8)} à imprimer (réconciliation)`,
    data: { template: 'receipt_v1', order_id: orderId, text: `Commande #${orderId.slice(0, 8)}` },
    lu: false,
  });
  const res = await fetch('https://www.cvneat.fr/api/notifications/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'delivery',
      title: 'Nouvelle commande disponible 🚚',
      body: `Commande #${orderId.slice(0, 8)} - ${total}€`,
      data: { type: 'new_order_available', orderId, url: '/delivery/dashboard' },
    }),
  });
  const body = await res.json().catch(() => ({}));
  console.log('Push livreurs:', res.status, body);
}

async function repairOne(pi, { refund = false, notify = false } = {}) {
  const orderId = pi.metadata.order_id;
  console.log(`\n→ ${orderId.slice(0, 8)} PI ${pi.id} ${pi.amount / 100}€`);
  const { order, paidAmount } = await linkOrderToPi(orderId, pi);
  console.log('  Lié en BDD (paid)', paidAmount + '€');

  if (refund) {
    const refund = await refundOrder(orderId, pi);
    console.log('  Remboursé:', refund.id, refund.amount / 100 + '€');
  } else if (notify) {
    await notifyOrder(orderId, order, order.restaurant_id);
    console.log('  Notifications envoyées');
  }
}

async function main() {
  if (scanOnly || (!orderIdArg && !piArg)) {
    const stuck = await findStuck(hours);
    console.log(`Commandes bloquées (${hours}h):`, stuck.length);
    for (const s of stuck) {
      console.log(
        ' -',
        s.orderId.slice(0, 8),
        s.pi.id,
        s.pi.amount / 100 + '€',
        s.order?.customer_email || '',
        'db:',
        s.order?.payment_status || 'missing'
      );
    }
    if (scanOnly || stuck.length === 0) return;
  }

  let pi = null;
  if (piArg) {
    pi = await stripe.paymentIntents.retrieve(piArg);
  } else if (orderIdArg) {
    const search = await stripe.paymentIntents.search({
      query: `metadata['order_id']:'${orderIdArg}'`,
      limit: 1,
    });
    pi = search.data[0] || null;
    if (!pi) throw new Error('PaymentIntent introuvable pour cette commande');
  }

  if (pi) {
    if (pi.status !== 'succeeded') throw new Error(`PI status=${pi.status}`);
    await repairOne(pi, { refund: doRefund, notify: doNotify });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

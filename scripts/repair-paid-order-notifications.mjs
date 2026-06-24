#!/usr/bin/env node
/**
 * Ré-enfile notifications restaurant/livreur pour une commande déjà payée
 * (paiement Stripe OK mais confirm/webhook raté).
 *
 * Usage: node scripts/repair-paid-order-notifications.mjs <orderId>
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const orderId = process.argv[2];
if (!orderId) {
  console.error('Usage: node scripts/repair-paid-order-notifications.mjs <orderId>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Variables Supabase manquantes');
  process.exit(1);
}

const sb = createClient(url, key);

async function main() {
  const { data: order, error } = await sb
    .from('commandes')
    .select(
      'id, restaurant_id, total, frais_livraison, discount_amount, total_paid, payment_status, statut, order_fulfillment, customer_first_name, customer_last_name, customer_phone, customer_email, adresse_livraison, ville_livraison, created_at'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    console.error('Commande introuvable:', error?.message);
    process.exit(1);
  }

  const ps = (order.payment_status || '').toLowerCase();
  if (ps !== 'paid' && ps !== 'succeeded') {
    console.error('Commande non payée:', order.payment_status);
    process.exit(1);
  }

  const { formatReceiptText } = await import('../lib/receipt/formatReceiptText.js');
  const { sendDeliveryAppPush } = await import('../lib/sendDeliveryAppPush.js');
  const { notifyDeliverySubscribers } = await import('../lib/pushNotifications.js');

  const { data: restaurant } = await sb.from('restaurants').select('id, nom').eq('id', order.restaurant_id).maybeSingle();
  const { data: details } = await sb
    .from('details_commande')
    .select('id, commande_id, quantite, prix_unitaire, menus ( nom, prix )')
    .eq('commande_id', order.id);

  const items = (details || []).map((d) => ({
    id: d.id,
    quantity: d.quantite,
    price: d.prix_unitaire,
    name: d.menus?.nom || 'Article',
  }));

  const text = formatReceiptText({ restaurant, order, items });
  await sb.from('notifications').insert({
    restaurant_id: order.restaurant_id,
    type: 'print_receipt',
    message: `Commande #${order.id?.slice(0, 8)} à imprimer`,
    data: {
      template: 'receipt_v1',
      format: 'dantsu_escpos_markup',
      order_id: order.id,
      order_number: null,
      text,
    },
    lu: false,
  });

  const notificationTotal = (parseFloat(order.total || 0) + parseFloat(order.frais_livraison || 0)).toFixed(2);
  const fulfillment = String(order.order_fulfillment || 'delivery').toLowerCase();

  if (fulfillment === 'pickup') {
    const { notifyPartnerNewOrder } = await import('../lib/notify-partner-new-order.js');
    await notifyPartnerNewOrder(order, { supabaseAdmin: sb, origin: 'https://www.cvneat.fr' });
    console.log('✅ Notification partenaire (retrait)');
  } else {
    const pushResult = await sendDeliveryAppPush({
      orderId: order.id,
      total: notificationTotal,
      data: { type: 'new_order_available', orderId: order.id, url: '/delivery/dashboard' },
    });
    console.log('✅ Push livreurs:', pushResult.sent, '/', pushResult.total);
    await notifyDeliverySubscribers(sb, {
      title: 'Nouvelle commande disponible 🚚',
      body: `Commande #${order.id?.slice(0, 8)} - ${notificationTotal}€`,
      data: { type: 'new_order_available', orderId: order.id, url: '/delivery/dashboard' },
    });
  }

  console.log('✅ Commande réparée:', order.id, restaurant?.nom, notificationTotal + '€');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

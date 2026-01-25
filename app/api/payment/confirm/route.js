import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '../../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const paymentIntentId = body?.paymentIntentId;
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId requis' }, { status: 400 });
    }

    // Récupérer le PaymentIntent côté Stripe (source de vérité)
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent) {
      return NextResponse.json({ error: 'PaymentIntent introuvable' }, { status: 404 });
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Paiement non confirmé (status=${paymentIntent.status})` },
        { status: 400 }
      );
    }

    const orderId = paymentIntent?.metadata?.order_id || paymentIntent?.metadata?.orderId || null;
    if (!orderId) {
      return NextResponse.json(
        { error: "metadata.order_id manquant sur le PaymentIntent (impossible de relier la commande)" },
        { status: 400 }
      );
    }

    // Charger la commande (pour calculs + notification)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('id, order_number, restaurant_id, total, frais_livraison, discount_amount, stripe_payment_intent_id, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande introuvable', details: orderError?.message },
        { status: 404 }
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

    // Mettre à jour la commande: paid + lier le PaymentIntentId (si besoin)
    const updatePayload = {
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
      ...(paidAmount !== null ? { total_paid: paidAmount } : {}),
      ...(computedDeliveryFee !== null ? { frais_livraison: computedDeliveryFee } : {}),
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
        { status: 500 }
      );
    }

    // Si aucune ligne n'a été modifiée/renvoyée (race condition), on s'arrête sans notifier
    if (!updated) {
      return NextResponse.json({ success: true, orderId: order.id, alreadyPaid: wasPaidBefore });
    }

    // Notifications:
    // NOUVEAU WORKFLOW: notifier les livreurs uniquement au moment où la commande passe réellement à "paid".
    // Si elle était déjà "paid" (ex: /api/orders/[id]), ne pas renvoyer de push (évite doublons).
    const isPaidNow = (updated.payment_status || '').toString().trim().toLowerCase() === 'paid';
    const transitionedToPaid = isPaidNow && !wasPaidBefore;
    if (transitionedToPaid) {
      try {
        const origin = new URL(request.url).origin;
        const notificationTotal = (
          parseFloat(updated.total || 0) + parseFloat(updated.frais_livraison || 0)
        ).toFixed(2);

        if (updated.restaurant_id) {
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

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur', details: e?.message }, { status: 500 });
  }
}



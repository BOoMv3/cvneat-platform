'use strict';

import webpush from 'web-push';

let webPushConfigured = false;

function configureWebPush() {
  if (webPushConfigured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.warn('VAPID keys manquantes : définissez NEXT_PUBLIC_VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY pour activer les notifications push.');
    return;
  }

  try {
    webpush.setVapidDetails('mailto:contact@cvneat.fr', publicKey, privateKey);
    webPushConfigured = true;
  } catch (error) {
    console.error('Erreur configuration web-push:', error);
  }
}

export async function notifyDeliverySubscribers(supabaseAdmin, payload = {}) {
  configureWebPush();

  if (!webPushConfigured) {
    return;
  }

  try {
    const { data: subscriptions, error } = await supabaseAdmin
      .from('delivery_push_subscriptions')
      .select('id, endpoint, keys');

    if (error) {
      console.error('❌ Erreur récupération subscriptions push:', error);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Nouvelle commande disponible',
      body: payload.body || '',
      data: payload.data || {},
      tag: payload.tag || 'delivery-notification',
    });

    const invalidEndpoints = [];

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys,
            },
            notificationPayload
          );
        } catch (error) {
          console.error('❌ Erreur envoi notification push:', error);

          if (error.statusCode === 404 || error.statusCode === 410) {
            invalidEndpoints.push(subscription.endpoint);
          }
        }
      })
    );

    if (invalidEndpoints.length > 0) {
      await supabaseAdmin
        .from('delivery_push_subscriptions')
        .delete()
        .in('endpoint', invalidEndpoints);
    }
  } catch (error) {
    console.error('❌ Erreur notification push:', error);
  }
}



'use strict';

/**
 * Envoie une notification push aux livreurs (app mobile device_tokens)
 * Utilisé directement par le webhook Stripe et payment/confirm - évite le fetch HTTP interne
 * qui peut échouer (timeout, cold start).
 */
import { createClient } from '@supabase/supabase-js';
import { sendAPNsNotification } from './apns';
import { sendFcmV1Message, isFcmV1Configured } from './fcm-v1';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function sendDeliveryAppPush({ orderId, total, title, body, data = {} }) {
  const t = title || 'Nouvelle commande disponible 🚚';
  const b = body || (orderId && total ? `Commande #${orderId.slice(0, 8)} - ${total}€` : 'Nouvelle commande à traiter');
  const payload = {
    ...data,
    type: data.type || 'new_order_available',
    orderId: data.orderId || orderId,
    url: data.url || '/delivery/dashboard'
  };

  try {
    // Récupérer les livreurs (users = vue auth.users + user_details, role dans user_details)
    const roleCandidates = ['delivery', 'livreur'];
    let users = [];
    const { data: byIn, error: errIn } = await supabase.from('users').select('id').in('role', roleCandidates);
    if (errIn) {
      console.error('❌ [sendDeliveryAppPush] Erreur users:', errIn);
      return { sent: 0, total: 0, message: errIn.message };
    }
    users = byIn || [];
    if (users.length === 0) {
      const { data: byIlike } = await supabase.from('users').select('id').or('role.ilike.%delivery%,role.ilike.%livreur%');
      if (byIlike?.length) users = byIlike;
    }
    if (users.length === 0) {
      console.warn('⚠️ [sendDeliveryAppPush] Aucun livreur (role delivery/livreur)');
      return { sent: 0, total: 0, message: 'Aucun livreur trouvé' };
    }

    const userIds = users.map((u) => u.id);
    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .in('user_id', userIds);

    if (error) {
      console.error('❌ [sendDeliveryAppPush] Erreur device_tokens:', error);
      return { sent: 0, total: 0, message: error.message };
    }
    if (!tokens?.length) {
      console.warn('⚠️ [sendDeliveryAppPush] Aucun device_token pour les livreurs');
      return { sent: 0, total: 0, message: 'Aucun token trouvé' };
    }

    const platformNorm = (p) => (p || '').toString().toLowerCase().trim();
    const iosTokens = tokens.filter((t) => platformNorm(t.platform) === 'ios');
    const androidTokens = tokens.filter((t) => platformNorm(t.platform) === 'android');

    let sentCount = 0;
    const errors = [];

    for (const tokenData of iosTokens) {
      try {
        await sendAPNsNotification(tokenData.token, t, b, payload);
        sentCount++;
      } catch (err) {
        console.error('❌ [sendDeliveryAppPush] APNs:', err?.message);
        const reason = (err?.apnsReason || err?.message || '').toString();
        const shouldDelete = reason.includes('Unregistered') || reason.includes('BadDeviceToken') || reason.includes('DeviceTokenNotForTopic') || err?.apnsStatus === 410;
        if (shouldDelete) {
          await supabase.from('device_tokens').delete().eq('token', tokenData.token).then(() => {}).catch(() => {});
        }
        errors.push({ platform: 'ios', error: err.message });
      }
    }

    if (androidTokens.length > 0) {
      const useV1 = isFcmV1Configured();
      const fcmServerKey = process.env.FIREBASE_SERVER_KEY;
      for (const tokenData of androidTokens) {
        try {
          let ok = false;
          if (useV1) {
            const r = await sendFcmV1Message(tokenData.token, t, b, payload, null);
            if (r?.ok) ok = true;
          }
          if (!ok && fcmServerKey) {
            const res = await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `key=${fcmServerKey}` },
              body: JSON.stringify({
                to: tokenData.token,
                notification: { title: t, body: b, sound: 'default' },
                data: payload,
                priority: 'high'
              })
            });
            ok = res.ok;
          }
          if (ok) sentCount++;
          else errors.push({ platform: 'android', error: 'Échec FCM' });
        } catch (err) {
          errors.push({ platform: 'android', error: err.message });
        }
      }
    }

    console.log(`✅ [sendDeliveryAppPush] Envoyé: ${sentCount}/${tokens.length} (iOS: ${iosTokens.length}, Android: ${androidTokens.length})`);
    return { sent: sentCount, total: tokens.length, errors };
  } catch (error) {
    console.error('❌ [sendDeliveryAppPush] Exception:', error);
    return { sent: 0, total: 0, message: error?.message };
  }
}

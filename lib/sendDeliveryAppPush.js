'use strict';

/**
 * Envoie une notification push « nouvelle commande » aux livreurs ET aux admins (device_tokens).
 * Les livreurs reçoivent le lien /delivery/dashboard ; les admins /admin/orders (évite doublon si compte des deux).
 * Utilisé par webhook Stripe, payment/confirm, PUT orders — pas de fetch HTTP interne.
 */
import { createClient } from '@supabase/supabase-js';
import { sendAPNsNotification } from './apns';
import { sendFcmV1Message, isFcmV1Configured } from './fcm-v1';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchUserIdsForRoles(roleCandidates) {
  const ids = new Set();
  if (!roleCandidates?.length) return [];
  const { data: byIn, error } = await supabase.from('users').select('id').in('role', roleCandidates);
  if (error) {
    console.error('❌ [sendDeliveryAppPush] Erreur users roles', roleCandidates, error);
    return [];
  }
  (byIn || []).forEach((u) => u?.id && ids.add(u.id));
  if (ids.size === 0) {
    const orClause = roleCandidates.map((r) => `role.ilike.%${r}%`).join(',');
    const { data: byIlike } = await supabase.from('users').select('id').or(orClause);
    (byIlike || []).forEach((u) => u?.id && ids.add(u.id));
  }
  return [...ids];
}

async function getTokensForUserIds(userIds) {
  if (!userIds?.length) return [];
  const { data, error } = await supabase
    .from('device_tokens')
    .select('token, platform')
    .in('user_id', userIds);
  if (error) {
    console.error('❌ [sendDeliveryAppPush] Erreur device_tokens:', error);
    return [];
  }
  return data || [];
}

const platformNorm = (p) => (p || '').toString().toLowerCase().trim();

async function sendPushToTokens(tokens, title, body, payload) {
  const iosTokens = tokens.filter((t) => platformNorm(t.platform) === 'ios');
  const androidTokens = tokens.filter((t) => platformNorm(t.platform) === 'android');
  let sentCount = 0;
  const errors = [];

  for (const tokenData of iosTokens) {
    try {
      await sendAPNsNotification(tokenData.token, title, body, payload);
      sentCount++;
    } catch (err) {
      console.error('❌ [sendDeliveryAppPush] APNs:', err?.message);
      const reason = (err?.apnsReason || err?.message || '').toString();
      const shouldDelete =
        reason.includes('Unregistered') ||
        reason.includes('BadDeviceToken') ||
        reason.includes('DeviceTokenNotForTopic') ||
        err?.apnsStatus === 410;
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
          const r = await sendFcmV1Message(tokenData.token, title, body, payload, null);
          if (r?.ok) ok = true;
        }
        if (!ok && fcmServerKey) {
          const res = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `key=${fcmServerKey}` },
            body: JSON.stringify({
              to: tokenData.token,
              notification: { title, body, sound: 'default' },
              data: payload,
              priority: 'high',
            }),
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

  return { sent: sentCount, total: tokens.length, errors };
}

export async function sendDeliveryAppPush({ orderId, total, title, body, data = {} }) {
  const t = title || 'Nouvelle commande disponible 🚚';
  const b = body || (orderId && total ? `Commande #${orderId.slice(0, 8)} - ${total}€` : 'Nouvelle commande à traiter');

  const baseType = data.type || 'new_order_available';
  const baseOrderId = data.orderId || orderId;

  try {
    const deliveryIds = await fetchUserIdsForRoles(['delivery', 'livreur']);
    const adminIds = await fetchUserIdsForRoles(['admin']);

    const adminSet = new Set(adminIds);
    /** Livreurs « purs » : pas aussi admin (sinon une seule notif côté admin). */
    const deliveryOnlyIds = deliveryIds.filter((id) => !adminSet.has(id));

    if (deliveryOnlyIds.length === 0 && adminIds.length === 0) {
      console.warn('⚠️ [sendDeliveryAppPush] Aucun livreur ni admin (roles delivery/livreur/admin)');
      return { sent: 0, total: 0, message: 'Aucun destinataire (users)' };
    }

    const payloadDriver = {
      ...data,
      type: baseType,
      orderId: baseOrderId,
      url: data.url || '/delivery/dashboard',
    };
    const payloadAdmin = {
      ...data,
      type: baseType,
      orderId: baseOrderId,
      url: '/admin/orders',
    };

    const tokensDelivery = await getTokensForUserIds(deliveryOnlyIds);
    const tokensAdmin = await getTokensForUserIds(adminIds);

    if (tokensDelivery.length === 0 && tokensAdmin.length === 0) {
      console.warn('⚠️ [sendDeliveryAppPush] Aucun device_token pour livreurs ni admins');
      return { sent: 0, total: 0, message: 'Aucun token trouvé' };
    }

    const rDel = await sendPushToTokens(tokensDelivery, t, b, payloadDriver);
    const rAdm = await sendPushToTokens(tokensAdmin, t, b, payloadAdmin);

    const sent = rDel.sent + rAdm.sent;
    const total = rDel.total + rAdm.total;
    const errors = [...(rDel.errors || []), ...(rAdm.errors || [])];

    console.log(
      `✅ [sendDeliveryAppPush] Envoyé: ${sent}/${total} (livreurs-only: ${tokensDelivery.length} tok, admins: ${tokensAdmin.length} tok)`
    );
    return { sent, total, errors };
  } catch (error) {
    console.error('❌ [sendDeliveryAppPush] Exception:', error);
    return { sent: 0, total: 0, message: error?.message };
  }
}

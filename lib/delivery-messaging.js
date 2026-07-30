import { createClient } from '@supabase/supabase-js';
import { sendPushToUserIds } from './sendDeliveryAppPush';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export function getDeliveryMessagingAdmin() {
  return supabaseAdmin;
}

export async function listDeliveryUserIds() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .in('role', ['delivery', 'livreur']);
  if (error) {
    console.error('listDeliveryUserIds:', error.message);
    return [];
  }
  return (data || []).map((u) => u.id).filter(Boolean);
}

/**
 * Crée un message inbox (admin ou système) + push optionnel (app native + web).
 * @returns {{ id, created_at, pushResult }}
 */
export async function createDeliveryInboxMessage({
  adminId = null,
  deliveryUserId = null,
  subject,
  body,
  kind = 'admin',
  eventType = null,
  data = {},
  push = true,
}) {
  const { data: row, error } = await supabaseAdmin
    .from('delivery_messages')
    .insert({
      admin_id: adminId,
      delivery_user_id: deliveryUserId || null,
      subject: String(subject || '').trim(),
      body: String(body || '').trim(),
      kind,
      event_type: eventType,
      data: data || {},
    })
    .select('id, created_at')
    .single();

  if (error) throw error;

  let pushResult = { sent: 0, total: 0, web: false, skipped: !push };

  if (push) {
    let targets = [];
    if (deliveryUserId) {
      targets = [deliveryUserId];
    } else {
      targets = await listDeliveryUserIds();
    }
    const title = subject || "Nouveau message CVN'EAT";
    const pushBody = (body || '').slice(0, 140);
    const payload = {
      type: eventType || kind || 'delivery_message',
      url: '/delivery/messages',
      messageId: row.id,
      ...(data || {}),
    };

    // 1) App native (APNs / FCM via device_tokens)
    try {
      const native = await sendPushToUserIds(targets, title, pushBody, payload);
      pushResult = {
        sent: native?.sent || 0,
        total: native?.total || 0,
        message: native?.message || null,
        targets: targets.length,
        web: false,
      };
      console.log('[delivery-message] push native:', pushResult);
    } catch (e) {
      console.warn('push delivery message native:', e?.message);
      pushResult.error = e?.message || String(e);
    }

    // 2) Web Push (navigateurs / PWA livreur)
    try {
      const { notifyDeliverySubscribers } = await import('./pushNotifications');
      await notifyDeliverySubscribers(supabaseAdmin, {
        title,
        body: pushBody,
        tag: `delivery-msg-${row.id}`,
        data: payload,
      });
      pushResult.web = true;
    } catch (e) {
      console.warn('push delivery message web:', e?.message);
    }
  }

  return { ...row, pushResult };
}

export function orderedDmPair(userId1, userId2) {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

export async function getOrCreateDmThread(userId1, userId2) {
  if (!userId1 || !userId2 || userId1 === userId2) {
    throw new Error('Participants invalides');
  }
  const [user_a, user_b] = orderedDmPair(userId1, userId2);
  const { data: existing } = await supabaseAdmin
    .from('delivery_dm_threads')
    .select('*')
    .eq('user_a', user_a)
    .eq('user_b', user_b)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from('delivery_dm_threads')
    .insert({ user_a, user_b })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

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

export async function listAdminUserIds() {
  const { data, error } = await supabaseAdmin.from('users').select('id').eq('role', 'admin');
  if (error) {
    console.error('listAdminUserIds:', error.message);
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
    let deliveryTargets = [];
    let adminTargets = [];

    if (deliveryUserId) {
      deliveryTargets = [deliveryUserId];
      // Confirmation push à l’admin émetteur
      if (adminId) adminTargets = [adminId];
    } else {
      // Broadcast : livreurs + admins (comme les notifs de nouvelles courses)
      const [livreurs, admins] = await Promise.all([
        listDeliveryUserIds(),
        listAdminUserIds(),
      ]);
      const adminSet = new Set(admins);
      // Évite un double push si un compte est à la fois livreur et admin
      deliveryTargets = livreurs.filter((id) => !adminSet.has(id));
      adminTargets = admins;
    }
    deliveryTargets = [...new Set(deliveryTargets.filter(Boolean))];
    adminTargets = [...new Set(adminTargets.filter(Boolean))];

    const title = subject || "Nouveau message CVN'EAT";
    const pushBody = (body || '').slice(0, 140);
    const basePayload = {
      type: eventType || kind || 'delivery_message',
      messageId: row.id,
      ...(data || {}),
    };
    const payloadDriver = { ...basePayload, url: '/delivery/messages' };
    const payloadAdmin = { ...basePayload, url: '/admin/delivery-messages' };

    // 1) App native (APNs / FCM via device_tokens) — URLs distinctes livreur / admin
    try {
      const [nativeDriver, nativeAdmin] = await Promise.all([
        sendPushToUserIds(deliveryTargets, title, pushBody, payloadDriver),
        sendPushToUserIds(adminTargets, title, pushBody, payloadAdmin),
      ]);
      pushResult = {
        sent: (nativeDriver?.sent || 0) + (nativeAdmin?.sent || 0),
        total: (nativeDriver?.total || 0) + (nativeAdmin?.total || 0),
        message: nativeDriver?.message || nativeAdmin?.message || null,
        targets: deliveryTargets.length + adminTargets.length,
        targetsDelivery: deliveryTargets.length,
        targetsAdmin: adminTargets.length,
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
        data: payloadDriver,
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

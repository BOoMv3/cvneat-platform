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
 * Crée un message inbox (admin ou système) + push optionnel.
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

  if (push) {
    let targets = [];
    if (deliveryUserId) {
      targets = [deliveryUserId];
    } else {
      targets = await listDeliveryUserIds();
    }
    const title = subject || 'Nouveau message CVN\'EAT';
    const pushBody = (body || '').slice(0, 140);
    await sendPushToUserIds(targets, title, pushBody, {
      type: eventType || kind || 'delivery_message',
      url: '/delivery/messages',
      messageId: row.id,
      ...(data || {}),
    }).catch((e) => console.warn('push delivery message:', e?.message));
  }

  return row;
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

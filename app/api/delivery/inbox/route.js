import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDeliveryMessagingAdmin } from '@/lib/delivery-messaging';

export const dynamic = 'force-dynamic';

async function requireDelivery(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: 'Non autorisé', status: 401 };
  const token = authHeader.slice(7);
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const {
    data: { user },
    error,
  } = await anon.auth.getUser(token);
  if (error || !user) return { error: 'Token invalide', status: 401 };

  const admin = getDeliveryMessagingAdmin();
  const { data: profile } = await admin.from('users').select('id, role, prenom, nom, email').eq('id', user.id).maybeSingle();
  const role = (profile?.role || '').toLowerCase();
  if (!['delivery', 'livreur', 'admin'].includes(role)) {
    return { error: 'Accès livreur requis', status: 403 };
  }
  return { user, profile, admin };
}

export async function GET(request) {
  try {
    const auth = await requireDelivery(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { admin, user } = auth;
    const { data: messages, error } = await admin
      .from('delivery_messages')
      .select('id, created_at, subject, body, kind, event_type, data, delivery_user_id, admin_id')
      .or(`delivery_user_id.is.null,delivery_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('delivery inbox:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ids = (messages || []).map((m) => m.id);
    let readSet = new Set();
    if (ids.length) {
      const { data: reads } = await admin
        .from('delivery_message_reads')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', ids);
      readSet = new Set((reads || []).map((r) => r.message_id));
    }

    const items = (messages || []).map((m) => ({
      ...m,
      read: readSet.has(m.id),
      source: 'inbox',
    }));

    const unread = items.filter((m) => !m.read).length;
    return NextResponse.json({ messages: items, unread });
  } catch (e) {
    console.error('delivery inbox GET:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireDelivery(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { messageIds, markAll } = await request.json().catch(() => ({}));
    const { admin, user } = auth;

    let ids = Array.isArray(messageIds) ? messageIds.filter(Boolean) : [];
    if (markAll) {
      const { data: messages } = await admin
        .from('delivery_messages')
        .select('id')
        .or(`delivery_user_id.is.null,delivery_user_id.eq.${user.id}`)
        .limit(200);
      ids = (messages || []).map((m) => m.id);
    }
    if (!ids.length) return NextResponse.json({ success: true, marked: 0 });

    const rows = ids.map((message_id) => ({
      message_id,
      user_id: user.id,
      read_at: new Date().toISOString(),
    }));

    const { error } = await admin.from('delivery_message_reads').upsert(rows, {
      onConflict: 'message_id,user_id',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, marked: ids.length });
  } catch (e) {
    console.error('delivery inbox PATCH:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getDeliveryMessagingAdmin,
  getOrCreateDmThread,
} from '@/lib/delivery-messaging';
import { sendPushToUserIds } from '@/lib/sendDeliveryAppPush';

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
  const { data: profile } = await admin
    .from('users')
    .select('id, role, prenom, nom, email')
    .eq('id', user.id)
    .maybeSingle();
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

    const { data: threads, error } = await admin
      .from('delivery_dm_threads')
      .select('id, created_at, updated_at, user_a, user_b')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const otherIds = [...new Set((threads || []).map((t) => (t.user_a === user.id ? t.user_b : t.user_a)))];
    const { data: peers } = otherIds.length
      ? await admin.from('users').select('id, prenom, nom, email').in('id', otherIds)
      : { data: [] };
    const peerMap = new Map((peers || []).map((p) => [p.id, p]));

    const enriched = [];
    for (const t of threads || []) {
      const otherId = t.user_a === user.id ? t.user_b : t.user_a;
      const peer = peerMap.get(otherId) || {};
      const { data: lastMsg } = await admin
        .from('delivery_dm_messages')
        .select('id, body, created_at, sender_id')
        .eq('thread_id', t.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: readRow } = await admin
        .from('delivery_dm_reads')
        .select('last_read_at')
        .eq('thread_id', t.id)
        .eq('user_id', user.id)
        .maybeSingle();

      const lastRead = readRow?.last_read_at ? new Date(readRow.last_read_at).getTime() : 0;
      let unread = 0;
      if (lastMsg && lastMsg.sender_id !== user.id) {
        if (new Date(lastMsg.created_at).getTime() > lastRead) unread = 1;
      }

      enriched.push({
        id: t.id,
        updated_at: t.updated_at,
        peer: {
          id: otherId,
          name: `${peer.prenom || ''} ${peer.nom || ''}`.trim() || peer.email || 'Livreur',
          email: peer.email,
        },
        last_message: lastMsg || null,
        unread,
      });
    }

    return NextResponse.json({ threads: enriched });
  } catch (e) {
    console.error('dm threads GET:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireDelivery(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { peerId } = await request.json().catch(() => ({}));
    if (!peerId) return NextResponse.json({ error: 'peerId requis' }, { status: 400 });

    const { data: peer } = await auth.admin
      .from('users')
      .select('id, role')
      .eq('id', peerId)
      .maybeSingle();
    const role = (peer?.role || '').toLowerCase();
    if (!peer || !['delivery', 'livreur'].includes(role)) {
      return NextResponse.json({ error: 'Livreur introuvable' }, { status: 404 });
    }

    const thread = await getOrCreateDmThread(auth.user.id, peerId);
    return NextResponse.json({ thread });
  } catch (e) {
    console.error('dm threads POST:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

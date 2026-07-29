import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDeliveryMessagingAdmin, createDeliveryInboxMessage } from '@/lib/delivery-messaging';
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
    .select('id, role, prenom, nom')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile?.role || '').toLowerCase();
  if (!['delivery', 'livreur', 'admin'].includes(role)) {
    return { error: 'Accès livreur requis', status: 403 };
  }
  return { user, profile: { ...profile, role }, admin };
}

async function assertThreadParticipant(admin, threadId, userId) {
  const { data: thread } = await admin
    .from('delivery_dm_threads')
    .select('*')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread) return null;
  if (thread.user_a !== userId && thread.user_b !== userId) return null;
  return thread;
}

export async function GET(request, { params }) {
  try {
    const auth = await requireDelivery(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const threadId = params?.threadId;
    const thread = await assertThreadParticipant(auth.admin, threadId, auth.user.id);
    if (!thread) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });

    const { data: messages, error } = await auth.admin
      .from('delivery_dm_messages')
      .select('id, created_at, sender_id, body')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await auth.admin.from('delivery_dm_reads').upsert(
      {
        thread_id: threadId,
        user_id: auth.user.id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'thread_id,user_id' }
    );

    return NextResponse.json({ messages: messages || [], thread });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const auth = await requireDelivery(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const threadId = params?.threadId;
    const thread = await assertThreadParticipant(auth.admin, threadId, auth.user.id);
    if (!thread) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });

    const { body } = await request.json().catch(() => ({}));
    const text = String(body || '').trim();
    if (!text) return NextResponse.json({ error: 'Message vide' }, { status: 400 });

    const { data: msg, error } = await auth.admin
      .from('delivery_dm_messages')
      .insert({
        thread_id: threadId,
        sender_id: auth.user.id,
        body: text,
      })
      .select('id, created_at, sender_id, body')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await auth.admin
      .from('delivery_dm_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    const peerId = thread.user_a === auth.user.id ? thread.user_b : thread.user_a;
    const senderRole = (auth.profile?.role || '').toLowerCase();
    const isAdminSender = senderRole === 'admin';
    const senderName = isAdminSender
      ? `Support CVN'EAT${auth.profile?.prenom ? ` (${auth.profile.prenom})` : ''}`
      : `${auth.profile?.prenom || ''} ${auth.profile?.nom || ''}`.trim() || 'Un livreur';

    await sendPushToUserIds([peerId], `Message de ${senderName}`, text.slice(0, 120), {
      type: 'delivery_dm',
      url: `/delivery/messages?tab=dm&thread=${threadId}`,
      threadId,
    }).catch(() => {});

    // Si l'admin écrit en chat, créer aussi une entrée Inbox pour que le livreur le voie
    // sans devoir chercher l'onglet Discussions.
    if (isAdminSender) {
      const { data: peer } = await auth.admin
        .from('users')
        .select('id, role')
        .eq('id', peerId)
        .maybeSingle();
      const peerRole = (peer?.role || '').toLowerCase();
      if (peer && ['delivery', 'livreur'].includes(peerRole)) {
        await createDeliveryInboxMessage({
          adminId: auth.user.id,
          deliveryUserId: peerId,
          subject: 'Message du support CVN\'EAT',
          body: text,
          kind: 'admin',
          eventType: 'admin_dm',
          data: { threadId, url: `/delivery/messages?tab=dm&thread=${threadId}` },
          push: false, // push déjà envoyé ci-dessus
        }).catch((e) => console.warn('inbox mirror dm:', e?.message));
      }
    }

    return NextResponse.json({ message: msg });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

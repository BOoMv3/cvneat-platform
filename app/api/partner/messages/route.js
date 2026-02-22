import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function getBearerToken(req) {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null;
}

async function getRestaurantForUser(userId) {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function GET(request) {
  try {
    const token = getBearerToken(request);
    if (!token || !supabaseAdmin) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const restaurant = await getRestaurantForUser(user.id);
    if (!restaurant) return NextResponse.json({ messages: [], unreadCount: 0 });

    const { data: messages, error: msgErr } = await supabaseAdmin
      .from('partner_messages')
      .select('id, subject, body, created_at, restaurant_id')
      .or(`restaurant_id.is.null,restaurant_id.eq.${restaurant.id}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (msgErr) {
      console.error('partner_messages fetch:', msgErr);
      return NextResponse.json({ messages: [], unreadCount: 0 });
    }

    const ids = (messages || []).map((m) => m.id);

    let visibleMessages = messages || [];
    try {
      const { data: hiddenRows } = await supabaseAdmin
        .from('partner_message_hidden')
        .select('message_id')
        .eq('restaurant_id', restaurant.id)
        .in('message_id', ids);

      const hiddenSet = new Set((hiddenRows || []).map((h) => h.message_id));
      visibleMessages = (messages || []).filter((m) => !hiddenSet.has(m.id));
    } catch (hiddenErr) {
      console.warn('partner_message_hidden table may not exist:', hiddenErr);
    }

    const visibleIds = visibleMessages.map((m) => m.id);
    const { data: reads } = await supabaseAdmin
      .from('partner_message_reads')
      .select('message_id')
      .eq('restaurant_id', restaurant.id)
      .in('message_id', visibleIds);

    const readSet = new Set((reads || []).map((r) => r.message_id));
    const enriched = visibleMessages.map((m) => ({
      ...m,
      isBroadcast: m.restaurant_id == null,
      read: readSet.has(m.id),
    }));
    const unreadCount = enriched.filter((m) => !m.read).length;

    return NextResponse.json({ messages: enriched, unreadCount });
  } catch (e) {
    console.error('partner messages GET:', e);
    return NextResponse.json({ messages: [], unreadCount: 0 });
  }
}

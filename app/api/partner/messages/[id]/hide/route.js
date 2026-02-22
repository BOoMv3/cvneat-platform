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

export async function PATCH(request, { params }) {
  try {
    const token = getBearerToken(request);
    if (!token || !supabaseAdmin) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const restaurant = await getRestaurantForUser(user.id);
    if (!restaurant) return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });

    const messageId = params?.id;
    if (!messageId) return NextResponse.json({ error: 'ID message requis' }, { status: 400 });

    await supabaseAdmin
      .from('partner_message_hidden')
      .upsert(
        { message_id: messageId, restaurant_id: restaurant.id, hidden_at: new Date().toISOString() },
        { onConflict: 'message_id,restaurant_id' }
      );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('partner messages hide:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

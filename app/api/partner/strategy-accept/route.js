import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const getBearerToken = (request) => {
  const h = request.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null;
};

async function getAuthedUser(request) {
  const bearer = getBearerToken(request);
  if (bearer && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.getUser(bearer);
    if (!error && data?.user) return { user: data.user };
  }
  return { user: null };
}

async function getRestaurantForUser(userId) {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom, user_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function GET(request) {
  try {
    const { user } = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const restaurant = await getRestaurantForUser(user.id);
    if (!restaurant) return NextResponse.json({ accepted: false, restaurant: null });

    const { data } = await supabaseAdmin
      .from('restaurants')
      .select('strategie_boost_acceptee, strategie_boost_accepted_at, strategie_boost_reduction_pct')
      .eq('id', restaurant.id)
      .single();

    return NextResponse.json({
      accepted: !!data?.strategie_boost_acceptee,
      acceptedAt: data?.strategie_boost_accepted_at || null,
      reductionPct: data?.strategie_boost_reduction_pct ?? null,
      restaurant: { id: restaurant.id, nom: restaurant.nom },
    });
  } catch (e) {
    console.error('strategy-accept GET:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user } = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const restaurant = await getRestaurantForUser(user.id);
    if (!restaurant) return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });

    const { error } = await supabaseAdmin
      .from('restaurants')
      .update({
        strategie_boost_acceptee: true,
        strategie_boost_accepted_at: new Date().toISOString(),
      })
      .eq('id', restaurant.id);

    if (error) {
      console.error('strategy-accept POST:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: updated } = await supabaseAdmin
      .from('restaurants')
      .select('strategie_boost_reduction_pct')
      .eq('id', restaurant.id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Merci ! Nous vous recontacterons rapidement.',
      restaurant: { id: restaurant.id, nom: restaurant.nom },
      reductionPct: updated?.strategie_boost_reduction_pct ?? null,
    });
  } catch (e) {
    console.error('strategy-accept POST:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const getBearerToken = (req) => {
  const h = req.headers.get('authorization') || '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null;
};

async function getAuthedUser(req) {
  const bearer = getBearerToken(req);
  if (bearer && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.getUser(bearer);
    if (!error && data?.user) return data.user;
  }
  return null;
}

async function assertRestaurantOwner(restaurantId, userId) {
  const { data } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

// Accepte virgule ou point décimal (ex. 10,50 ou 10.50)
function parsePrix(v) {
  if (v == null || v === '') return NaN;
  const s = String(v).trim().replace(',', '.');
  return parseFloat(s);
}

function roundPrice(v) {
  const n = parsePrix(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export async function POST(request) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { restaurantId, updates } = await request.json().catch(() => ({}));
    if (!restaurantId || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'restaurantId et updates requis' }, { status: 400 });
    }

    const ok = await assertRestaurantOwner(restaurantId, user.id);
    if (!ok) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    let updated = 0;
    for (const u of updates) {
      const menuId = u.id || u.menuId;
      const prix = roundPrice(u.prix);
      if (!menuId || prix < 0) continue;

      const { error } = await supabaseAdmin
        .from('menus')
        .update({ prix })
        .eq('id', menuId)
        .eq('restaurant_id', restaurantId);
      if (!error) updated++;
    }
    return NextResponse.json({ updated, total: updates.length });
  } catch (e) {
    console.error('bulk-set-prices:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

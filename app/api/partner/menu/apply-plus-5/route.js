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

function roundPrice(v) {
  return Math.round(parseFloat(v) * 100) / 100;
}

const COEFF = 1.05; // +5%

export async function POST(request) {
  try {
    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { restaurantId } = await request.json().catch(() => ({}));
    if (!restaurantId) return NextResponse.json({ error: 'restaurantId requis' }, { status: 400 });

    const ok = await assertRestaurantOwner(restaurantId, user.id);
    if (!ok) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { data: items, error: fetchErr } = await supabaseAdmin
      .from('menus')
      .select('id, prix, supplements, prix_taille')
      .eq('restaurant_id', restaurantId);

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!items || items.length === 0) return NextResponse.json({ updated: 0, message: 'Aucun plat à modifier' });

    let updated = 0;
    for (const item of items) {
      const oldPrix = parseFloat(item.prix) || 0;
      const newPrix = oldPrix > 0 ? roundPrice(oldPrix * COEFF) : 0;
      const updates = {};

      if (newPrix > 0) updates.prix = newPrix;

      if (item.prix_taille != null && item.prix_taille !== '') {
        const oldTaille = parseFloat(item.prix_taille) || 0;
        if (oldTaille > 0) {
          updates.prix_taille = roundPrice(oldTaille * COEFF);
        }
      }

      if (Array.isArray(item.supplements) && item.supplements.length > 0) {
        updates.supplements = item.supplements.map((s) => {
          const oldSup = parseFloat(s?.prix_supplementaire ?? s?.prix ?? 0) || 0;
          if (oldSup <= 0) return s;
          return {
            ...s,
            prix_supplementaire: roundPrice(oldSup * COEFF),
            prix: roundPrice(oldSup * COEFF),
          };
        });
      }

      if (Object.keys(updates).length > 0) {
        const { error: upErr } = await supabaseAdmin
          .from('menus')
          .update(updates)
          .eq('id', item.id);
        if (!upErr) updated++;
      }
    }
    return NextResponse.json({ updated, total: items.length });
  } catch (e) {
    console.error('apply-plus-5:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

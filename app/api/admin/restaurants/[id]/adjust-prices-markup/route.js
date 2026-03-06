import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin as sharedSupabaseAdmin } from '../../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

const getAdminClient = () => {
  if (sharedSupabaseAdmin) return sharedSupabaseAdmin;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !url) return null;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

function roundPrice(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/**
 * POST /api/admin/restaurants/[id]/adjust-prices-markup
 * Passe les prix d'un markup à un autre (ex. +25% -> +7%).
 * Body: { oldMarkupPercent: 25, newMarkupPercent: 7 }
 * Formule: new_prix = current_prix * (1 + new/100) / (1 + old/100)
 */
export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (adminError || adminUser?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const restaurantId = params?.id;
    if (!restaurantId) {
      return NextResponse.json({ error: 'ID restaurant requis' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const oldMarkupPercent = Number(body.oldMarkupPercent);
    const newMarkupPercent = Number(body.newMarkupPercent);
    if (!Number.isFinite(oldMarkupPercent) || !Number.isFinite(newMarkupPercent)) {
      return NextResponse.json(
        { error: 'oldMarkupPercent et newMarkupPercent requis (ex: 25 et 7)' },
        { status: 400 }
      );
    }

    const factor = (1 + newMarkupPercent / 100) / (1 + oldMarkupPercent / 100);

    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin non configuré' }, { status: 500 });
    }

    const { data: items, error: fetchErr } = await supabaseAdmin
      .from('menus')
      .select('id, prix, supplements, prix_taille')
      .eq('restaurant_id', restaurantId);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ updated: 0, message: 'Aucun plat à modifier' });
    }

    let updated = 0;
    for (const item of items) {
      const updates = {};

      const oldPrix = parseFloat(item.prix) || 0;
      if (oldPrix > 0) {
        updates.prix = roundPrice(oldPrix * factor);
      }

      if (item.prix_taille != null && item.prix_taille !== '') {
        const oldTaille = parseFloat(item.prix_taille) || 0;
        if (oldTaille > 0) {
          updates.prix_taille = roundPrice(oldTaille * factor);
        }
      }

      if (Array.isArray(item.supplements) && item.supplements.length > 0) {
        updates.supplements = item.supplements.map((s) => {
          const oldSup = parseFloat(s?.prix_supplementaire ?? s?.prix ?? 0) || 0;
          if (oldSup <= 0) return s;
          return {
            ...s,
            prix_supplementaire: roundPrice(oldSup * factor),
            prix: roundPrice(oldSup * factor),
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

    return NextResponse.json({
      updated,
      total: items.length,
      message: `Prix passés de +${oldMarkupPercent}% à +${newMarkupPercent}% (${updated} article(s) mis à jour).`,
    });
  } catch (e) {
    console.error('adjust-prices-markup:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

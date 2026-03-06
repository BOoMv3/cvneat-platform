import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin as sharedSupabaseAdmin } from '../../../../../lib/supabase';
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
 * GET /api/admin/restaurants/price-markup-preview?oldMarkup=25&newMarkup=7
 * Retourne pour chaque restaurant la liste des prix actuels et simulés (passage à +7%).
 */
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const oldMarkup = Number(searchParams.get('oldMarkup')) || 25;
    const newMarkup = Number(searchParams.get('newMarkup')) || 7;
    const factor = (1 + newMarkup / 100) / (1 + oldMarkup / 100);

    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin non configuré' }, { status: 500 });
    }

    const { data: restaurants, error: errResto } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .order('nom');
    if (errResto) {
      return NextResponse.json({ error: errResto.message }, { status: 500 });
    }
    if (!restaurants?.length) {
      return NextResponse.json({ restaurants: [], message: 'Aucun restaurant' });
    }

    const result = [];
    for (const resto of restaurants) {
      const { data: items, error: errMenu } = await supabaseAdmin
        .from('menus')
        .select('id, nom, prix, supplements')
        .eq('restaurant_id', resto.id)
        .order('nom');
      if (errMenu) {
        result.push({ id: resto.id, nom: resto.nom, error: errMenu.message, items: [] });
        continue;
      }

      const itemsPreview = [];
      for (const item of items || []) {
        const currentPrix = parseFloat(item.prix) || 0;
        if (currentPrix > 0) {
          itemsPreview.push({
            type: 'article',
            nom: item.nom || '(sans nom)',
            currentPrix: roundPrice(currentPrix),
            newPrix: roundPrice(currentPrix * factor),
          });
        }
        if (item.prix_taille != null && item.prix_taille !== '' && Number(parseFloat(item.prix_taille)) > 0) {
          const currentTaille = parseFloat(item.prix_taille) || 0;
          itemsPreview.push({
            type: 'taille',
            nom: `${item.nom || 'Article'} (taille)`,
            currentPrix: roundPrice(currentTaille),
            newPrix: roundPrice(currentTaille * factor),
          });
        }
        if (Array.isArray(item.supplements) && item.supplements.length > 0) {
          for (const s of item.supplements) {
            const oldSup = parseFloat(s?.prix_supplementaire ?? s?.prix ?? 0) || 0;
            if (oldSup <= 0) continue;
            itemsPreview.push({
              type: 'supplement',
              nom: `+ ${s?.nom || s?.name || 'Suppl.'}`,
              currentPrix: roundPrice(oldSup),
              newPrix: roundPrice(oldSup * factor),
            });
          }
        }
      }

      result.push({
        id: resto.id,
        nom: resto.nom,
        items: itemsPreview,
      });
    }

    return NextResponse.json({
      oldMarkupPercent: oldMarkup,
      newMarkupPercent: newMarkup,
      restaurants: result,
    });
  } catch (e) {
    console.error('price-markup-preview:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

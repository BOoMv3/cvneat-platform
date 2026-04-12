import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeRestaurantOpenFields } from '@/lib/restaurant-open-compute';

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 });
    }
    const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
    const now = new Date();
    const debug = body?.debug === true;

    let query = sb.from('restaurants').select('id, horaires, ferme_manuellement, ouvert_manuellement');
    if (ids.length > 0) query = query.in('id', ids);

    const { data, error } = await query;
    if (error) {
      console.error('❌ open-status restaurants error:', error);
      return NextResponse.json({ error: 'Erreur chargement restaurants' }, { status: 500 });
    }

    const map = {};
    for (const r of data || []) {
      const openFields = normalizeRestaurantOpenFields(r, now);
      const row = { ...r, ...openFields };
      map[String(r.id)] = {
        isOpen: row.is_open_now === true,
        isManuallyClosed: row.is_manually_closed === true,
        ...(debug ? { reason: row.is_open_now ? 'open' : 'closed_manual_flag', meta: {} } : {}),
      };
    }

    const res = NextResponse.json({ map });
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  } catch (e) {
    console.error('❌ open-status error:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

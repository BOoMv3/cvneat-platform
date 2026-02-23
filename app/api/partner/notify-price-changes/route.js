import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: u } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!u || (u.role !== 'restaurant' && u.role !== 'partner' && u.role !== 'admin')) {
      return NextResponse.json({ error: 'Rôle non autorisé' }, { status: 403 });
    }

    const { data: restaurant } = await serviceClient
      .from('restaurants')
      .select('id, nom')
      .eq('user_id', user.id)
      .single();
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const message = body.message?.trim() || 'Le partenaire a terminé les modifications de prix (prix boutique / +5%).';

    const { data: notif, error } = await serviceClient
      .from('partner_price_change_notifications')
      .insert({
        restaurant_id: restaurant.id,
        message,
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('partner notify-price-changes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: notif.id });
  } catch (e) {
    console.error('notify-price-changes:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

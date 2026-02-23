import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
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

    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey
    );
    const { data: u } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!u || u.role !== 'admin') {
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 });
    }

    const { data, error } = await serviceClient
      .from('partner_price_change_notifications')
      .select(`
        id,
        restaurant_id,
        message,
        created_at,
        restaurants(id, nom)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('admin partner-price-notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (e) {
    console.error('admin partner-price-notifications:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

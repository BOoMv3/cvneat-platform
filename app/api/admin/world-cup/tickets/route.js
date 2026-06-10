import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Export des codes tickets pour tirage au sort (admin uniquement) */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
  }

  const db = getServiceClient();
  if (!db) {
    return NextResponse.json({ error: 'Configuration serveur' }, { status: 500 });
  }

  const { data: adminRow } = await db.from('users').select('role').eq('id', user.id).maybeSingle();
  if (adminRow?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { data, error } = await db
    .from('commandes')
    .select(
      'id, world_cup_ticket_code, created_at, total, discount_amount, payment_status, statut, customer_email, customer_first_name, customer_last_name, user_id'
    )
    .not('world_cup_ticket_code', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    count: data?.length || 0,
    tickets: (data || []).map((row) => ({
      code: row.world_cup_ticket_code,
      orderId: row.id,
      createdAt: row.created_at,
      email: row.customer_email,
      name: [row.customer_first_name, row.customer_last_name].filter(Boolean).join(' '),
      userId: row.user_id,
      statut: row.statut,
    })),
  });
}

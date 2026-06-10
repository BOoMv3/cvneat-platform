import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { isWorldCupModeEnabled } from '@/lib/world-cup-campaign';

export async function GET(request) {
  if (!isWorldCupModeEnabled()) {
    return NextResponse.json({ tickets: [] });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
  }

  const db = supabaseAdmin;
  if (!db) {
    return NextResponse.json({ error: 'Configuration serveur' }, { status: 500 });
  }

  const { data, error } = await db
    .from('commandes')
    .select('id, world_cup_ticket_code, created_at, statut, payment_status')
    .eq('user_id', user.id)
    .not('world_cup_ticket_code', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    const missingCol = (error.message || '').includes('world_cup_ticket_code');
    if (missingCol) return NextResponse.json({ tickets: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tickets = (data || [])
    .filter((o) => o.world_cup_ticket_code && o.statut !== 'annulee')
    .map((o) => ({
      id: o.id,
      orderId: o.id,
      code: o.world_cup_ticket_code,
      createdAt: o.created_at,
    }));

  return NextResponse.json({ tickets });
}

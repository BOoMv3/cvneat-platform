import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { VNEAT_PLUS_NAME, VNEAT_PLUS_MIN_ORDER_EUR, VNEAT_PLUS_PITCH, isVneatPlusActive } from '@/lib/vneat-plus';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(body, status = 200) {
  const r = NextResponse.json(body, { status });
  Object.entries(corsHeaders).forEach(([k, v]) => r.headers.set(k, v));
  return r;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/vneat-plus/status
 * Indique si l’utilisateur a CVN'Plus actif (Bearer JWT).
 */
export async function GET(request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return json({ active: false, name: VNEAT_PLUS_NAME, minOrderEur: VNEAT_PLUS_MIN_ORDER_EUR, pitch: VNEAT_PLUS_PITCH });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error } = await supabase.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (error || !user) {
    return json({ active: false, name: VNEAT_PLUS_NAME, minOrderEur: VNEAT_PLUS_MIN_ORDER_EUR, pitch: VNEAT_PLUS_PITCH });
  }

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

  if (!service) {
    return json({ active: false, name: VNEAT_PLUS_NAME, minOrderEur: VNEAT_PLUS_MIN_ORDER_EUR, error: 'server_config' });
  }

  const { data: row, error: e2 } = await service
    .from('users')
    .select('vneat_plus_ends_at')
    .eq('id', user.id)
    .maybeSingle();

  if (e2) {
    return json({ active: false, name: VNEAT_PLUS_NAME, minOrderEur: VNEAT_PLUS_MIN_ORDER_EUR, error: 'read' });
  }

  const active = isVneatPlusActive(row?.vneat_plus_ends_at);
  return json({
    active,
    name: VNEAT_PLUS_NAME,
    minOrderEur: VNEAT_PLUS_MIN_ORDER_EUR,
    endsAt: row?.vneat_plus_ends_at || null,
    pitch: VNEAT_PLUS_PITCH,
  });
}

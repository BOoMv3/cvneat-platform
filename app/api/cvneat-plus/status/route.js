import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  CVNEAT_PLUS_NAME,
  CVNEAT_PLUS_MIN_ORDER_EUR,
  CVNEAT_PLUS_PITCH,
  isCvneatPlusActive,
} from '@/lib/cvneat-plus';

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
 * GET /api/cvneat-plus/status
 */
export async function GET(request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return json({
      active: false,
      name: CVNEAT_PLUS_NAME,
      minOrderEur: CVNEAT_PLUS_MIN_ORDER_EUR,
      deliveryDiscount: 0.5,
      pitch: CVNEAT_PLUS_PITCH,
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error } = await supabase.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (error || !user) {
    return json({
      active: false,
      name: CVNEAT_PLUS_NAME,
      minOrderEur: CVNEAT_PLUS_MIN_ORDER_EUR,
      deliveryDiscount: 0.5,
      pitch: CVNEAT_PLUS_PITCH,
    });
  }

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

  if (!service) {
    return json({ active: false, name: CVNEAT_PLUS_NAME, minOrderEur: CVNEAT_PLUS_MIN_ORDER_EUR, error: 'server_config' });
  }

  const { data: row, error: e2 } = await service
    .from('users')
    .select('cvneat_plus_ends_at')
    .eq('id', user.id)
    .maybeSingle();

  if (e2) {
    return json({ active: false, name: CVNEAT_PLUS_NAME, minOrderEur: CVNEAT_PLUS_MIN_ORDER_EUR, error: 'read' });
  }

  const endsAt = row?.cvneat_plus_ends_at || null;
  const active = isCvneatPlusActive(endsAt);
  return json({
    active,
    name: CVNEAT_PLUS_NAME,
    minOrderEur: CVNEAT_PLUS_MIN_ORDER_EUR,
    deliveryDiscount: 0.5,
    endsAt: endsAt || null,
    pitch: CVNEAT_PLUS_PITCH,
  });
}

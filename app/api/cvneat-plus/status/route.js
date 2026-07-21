import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import {
  CVNEAT_PLUS_NAME,
  CVNEAT_PLUS_MIN_ORDER_EUR,
  CVNEAT_PLUS_PITCH,
  isCvneatPlusActive,
} from '@/lib/cvneat-plus';
import { syncCvneatPlusForUser } from '@/lib/cvneat-plus-sync';

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
 * ?sync=1 → resynchronise depuis Stripe si besoin
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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (error || !user) {
    return json({
      active: false,
      name: CVNEAT_PLUS_NAME,
      minOrderEur: CVNEAT_PLUS_MIN_ORDER_EUR,
      deliveryDiscount: 0.5,
      pitch: CVNEAT_PLUS_PITCH,
    });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return json({
      active: false,
      name: CVNEAT_PLUS_NAME,
      minOrderEur: CVNEAT_PLUS_MIN_ORDER_EUR,
      error: 'server_config',
    });
  }

  const service = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { searchParams } = new URL(request.url);
  const forceSync = searchParams.get('sync') === '1' || searchParams.get('sync') === 'true';

  const { data: row, error: e2 } = await service
    .from('users')
    .select('cvneat_plus_ends_at, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (e2) {
    return json({
      active: false,
      name: CVNEAT_PLUS_NAME,
      minOrderEur: CVNEAT_PLUS_MIN_ORDER_EUR,
      error: 'read',
    });
  }

  let endsAt = row?.cvneat_plus_ends_at || null;
  let active = isCvneatPlusActive(endsAt);
  let synced = false;

  // Si pas actif en BDD (ou sync forcée), tenter Stripe — corrige les webhooks manqués
  if ((!active || forceSync) && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const sync = await syncCvneatPlusForUser({
        stripe,
        db: service,
        userId: user.id,
        customerId: row?.stripe_customer_id || null,
      });
      if (sync?.ok && sync.synced) {
        synced = true;
        endsAt = sync.endsAt || null;
        active = isCvneatPlusActive(endsAt);
      }
    } catch (e) {
      console.warn("CVN'EAT Plus status sync:", e?.message || e);
    }
  }

  return json({
    active,
    name: CVNEAT_PLUS_NAME,
    minOrderEur: CVNEAT_PLUS_MIN_ORDER_EUR,
    deliveryDiscount: 0.5,
    endsAt: endsAt || null,
    pitch: CVNEAT_PLUS_PITCH,
    synced,
  });
}

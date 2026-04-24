import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
 * POST /api/cvneat-plus/portal
 */
export async function POST(request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey) {
    return json({ error: 'Serveur non configuré' }, { status: 503 });
  }

  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return json({ error: 'Connexion requise' }, { status: 401 });
  }

  const publicClient = createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user }, error: authErr } = await publicClient.auth.getUser(
    auth.replace(/^Bearer\s+/i, '')
  );
  if (authErr || !user) {
    return json({ error: 'Session invalide' }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await admin
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const customerId = (profile?.stripe_customer_id || '').trim();
  if (!customerId) {
    return json({ error: 'Aucun compte de facturation' }, { status: 400 });
  }

  const origin = request.headers.get('x-forwarded-host')
    ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
    : new URL(request.url).origin;

  let returnPath = '/abonnement';
  try {
    const body = await request.json();
    if (body?.returnPath) returnPath = String(body.returnPath);
  } catch {
    // no body
  }
  if (!returnPath.startsWith('/')) returnPath = '/abonnement';

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}${returnPath}`,
  });

  return json({ url: session.url });
}

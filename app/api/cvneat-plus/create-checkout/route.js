import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { CVNEAT_PLUS_NAME } from '@/lib/cvneat-plus';

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

function cvneatPlusPriceId() {
  return (process.env.STRIPE_CVNEAT_PLUS_PRICE_ID || process.env.STRIPE_VNEAT_PLUS_PRICE_ID || '').trim();
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/cvneat-plus/create-checkout
 */
export async function POST(request) {
  const priceId = cvneatPlusPriceId();
  if (!priceId) {
    return json(
      { error: 'Configuration Stripe incomplète (STRIPE_CVNEAT_PLUS_PRICE_ID ou STRIPE_VNEAT_PLUS_PRICE_ID).' },
      { status: 503 }
    );
  }

  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return json({ error: 'Connexion requise' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey) {
    return json({ error: 'Serveur non configuré' }, { status: 503 });
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

  const { data: profile, error: pErr } = await admin
    .from('users')
    .select('email, prenom, nom, stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (pErr || !profile) {
    return json({ error: 'Profil introuvable' }, { status: 400 });
  }

  const email = user.email || profile.email;
  if (!email) {
    return json({ error: 'Email requis' }, { status: 400 });
  }

  let customerId = (profile.stripe_customer_id || '').trim() || null;
  if (!customerId) {
    const c = await stripe.customers.create({
      email,
      name: [profile.prenom, profile.nom].filter(Boolean).join(' ').trim() || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = c.id;
    await admin.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const origin = request.headers.get('x-forwarded-host')
    ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
    : new URL(request.url).origin;

  let successPath = '/abonnement';
  let cancelPath = '/abonnement';
  try {
    const body = await request.json();
    if (body?.successPath) successPath = String(body.successPath);
    if (body?.cancelPath) cancelPath = String(body.cancelPath);
  } catch {
    // no body
  }
  if (!successPath.startsWith('/')) successPath = '/abonnement';
  if (!cancelPath.startsWith('/')) cancelPath = '/abonnement';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}${successPath}?cvneat_plus=ok`,
    cancel_url: `${origin}${cancelPath}?cvneat_plus=cancel`,
    allow_promotion_codes: true,
    client_reference_id: user.id,
    metadata: { supabase_user_id: user.id, product: 'cvneat_plus' },
    subscription_data: {
      metadata: { supabase_user_id: user.id, product: 'cvneat_plus' },
    },
  });

  if (!session.url) {
    return json({ error: 'Impossible de créer la session' }, { status: 500 });
  }

  return json({
    name: CVNEAT_PLUS_NAME,
    url: session.url,
  });
}

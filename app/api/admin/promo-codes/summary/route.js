import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Email',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization');
  const token =
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null) ||
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('supabase-auth-token')?.value;

  if (!token) return { error: 'Non autorisé', status: 401 };

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) return { error: 'Token invalide', status: 401 };

  const { data: profile, error: profErr } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profErr || !profile || profile.role !== 'admin') {
    return { error: 'Accès refusé - Admin requis', status: 403 };
  }

  return { userId: user.id };
}

export async function GET(request) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const codeRaw = (searchParams.get('code') || '').toString().trim().toUpperCase();
    if (!codeRaw) {
      return NextResponse.json({ error: 'Paramètre "code" requis' }, { status: 400, headers: corsHeaders });
    }

    const { data: promo, error: promoErr } = await supabaseAdmin
      .from('promo_codes')
      .select('id, code, description, discount_type, discount_value, current_uses, max_uses, valid_from, valid_until, is_active')
      .eq('code', codeRaw)
      .maybeSingle();

    if (promoErr) {
      return NextResponse.json({ error: promoErr.message }, { status: 500, headers: corsHeaders });
    }
    if (!promo) {
      return NextResponse.json({ error: 'Code promo introuvable' }, { status: 404, headers: corsHeaders });
    }

    // Count usages (table promo_code_usage)
    const { count: usageCount, error: usageErr } = await supabaseAdmin
      .from('promo_code_usage')
      .select('id', { count: 'exact', head: true })
      .eq('promo_code_id', promo.id);

    if (usageErr) {
      return NextResponse.json({ error: usageErr.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        promo,
        usageCount: usageCount || 0,
      },
      { headers: corsHeaders }
    );
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500, headers: corsHeaders });
  }
}


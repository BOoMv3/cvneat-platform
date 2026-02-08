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

function parseIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(request) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const code = (body.code || '').toString().trim().toUpperCase();
    const description = (body.description || '').toString().trim();
    const discountType = (body.discount_type || body.discountType || 'percentage').toString().trim();
    const discountValue = Number(body.discount_value ?? body.discountValue ?? 0);
    const validFrom = parseIsoOrNull(body.valid_from || body.validFrom) || new Date().toISOString();
    const validUntil = parseIsoOrNull(body.valid_until || body.validUntil) || null;
    const isActive = body.is_active !== undefined ? !!body.is_active : body.isActive !== undefined ? !!body.isActive : true;

    if (!code) {
      return NextResponse.json({ error: 'code requis' }, { status: 400, headers: corsHeaders });
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: 'discount_value invalide' }, { status: 400, headers: corsHeaders });
    }
    if (!['percentage', 'fixed', 'free_delivery'].includes(discountType)) {
      return NextResponse.json({ error: 'discount_type invalide' }, { status: 400, headers: corsHeaders });
    }

    const payload = {
      code,
      description: description || null,
      discount_type: discountType,
      discount_value: discountValue,
      valid_from: validFrom,
      valid_until: validUntil,
      is_active: isActive,
    };

    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .upsert(payload, { onConflict: 'code' })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ promo: data }, { headers: corsHeaders });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500, headers: corsHeaders });
  }
}


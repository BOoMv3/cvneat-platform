import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function makeCode(userId) {
  const short = String(userId || '')
    .replace(/-/g, '')
    .slice(0, 6)
    .toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `AMI${short}${rand}`.slice(0, 14);
}

/**
 * GET /api/referral/my-code
 * Retourne (ou crée) le code parrainage personnel de l'utilisateur connecté.
 */
export async function GET(request) {
  try {
    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const admin = getAdmin();
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user?.id) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }
    const userId = userRes.user.id;

    const { data: existing } = await admin
      .from('promo_codes')
      .select('id, code, discount_type, discount_value, description, is_active, first_order_only')
      .eq('created_by', userId)
      .ilike('code', 'AMI%')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.code) {
      return NextResponse.json({
        code: existing.code,
        discount_type: existing.discount_type,
        discount_value: existing.discount_value,
        description: existing.description,
        shareUrl: `https://www.cvneat.fr/register?ref=${encodeURIComponent(existing.code)}`,
      });
    }

    let code = makeCode(userId);
    for (let i = 0; i < 5; i++) {
      const { data: clash } = await admin
        .from('promo_codes')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      if (!clash) break;
      code = makeCode(userId);
    }

    const { data: created, error } = await admin
      .from('promo_codes')
      .insert({
        code,
        description: `Parrainage ami — -5 € première commande (parrain ${userId.slice(0, 8)})`,
        discount_type: 'fixed',
        discount_value: 5,
        min_order_amount: 15,
        max_uses: null,
        max_uses_per_user: 1,
        first_order_only: true,
        new_users_only: true,
        is_active: true,
        created_by: userId,
      })
      .select('id, code, discount_type, discount_value, description')
      .single();

    if (error) {
      console.error('referral create:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      code: created.code,
      discount_type: created.discount_type,
      discount_value: created.discount_value,
      description: created.description,
      shareUrl: `https://www.cvneat.fr/register?ref=${encodeURIComponent(created.code)}`,
      created: true,
    });
  } catch (e) {
    console.error('referral GET:', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

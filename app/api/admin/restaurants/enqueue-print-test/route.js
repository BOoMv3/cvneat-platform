import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatReceiptText } from '../../../../../lib/receipt/formatReceiptText';

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

/**
 * POST /api/admin/restaurants/enqueue-print-test
 * Body: { restaurantId: string, text?: string }
 *
 * Creates a `print_receipt` notification without creating any order.
 */
export async function POST(request) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const restaurantId = (body?.restaurantId || '').toString().trim();
    const customText = body?.text;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId requis' }, { status: 400, headers: corsHeaders });
    }

    const { data: restaurant, error: rErr } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .eq('id', restaurantId)
      .maybeSingle();
    if (rErr || !restaurant) {
      return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404, headers: corsHeaders });
    }

    const text =
      typeof customText === 'string' && customText.trim()
        ? customText.trim()
        : formatReceiptText({
            restaurant,
            order: {
              id: 'TEST-PRINT',
              order_number: 'TEST',
              created_at: new Date().toISOString(),
              total: 12.5,
              frais_livraison: 2.5,
              discount_amount: 1,
              total_paid: 14,
              customer_first_name: 'Test',
              customer_last_name: 'Impression',
              customer_phone: '06 00 00 00 00',
              adresse_livraison: '1 Rue Exemple',
              ville_livraison: '34000 Montpellier',
            },
            items: [
              { quantity: 1, name: 'Burger test', price: 10 },
              { quantity: 1, name: 'Frites', price: 2.5 },
            ],
          });

    const { data: notification, error: nErr } = await supabaseAdmin
      .from('notifications')
      .insert({
        restaurant_id: restaurantId,
        type: 'print_receipt',
        message: 'TEST impression bon',
        data: {
          template: 'receipt_v1',
          format: 'dantsu_escpos_markup',
          test: true,
          text,
        },
        lu: false,
      })
      .select()
      .maybeSingle();

    if (nErr) {
      return NextResponse.json({ error: nErr.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, notificationId: notification?.id || null }, { headers: corsHeaders });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500, headers: corsHeaders });
  }
}


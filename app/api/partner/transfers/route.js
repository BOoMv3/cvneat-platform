import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getPartnerRestaurant(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { error: 'Non autorisé', status: 401 };

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return { error: 'Token invalide', status: 401 };

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role || '').toString().toLowerCase();
  if (!['restaurant', 'partner', 'admin'].includes(role)) {
    return { error: 'Accès réservé aux partenaires', status: 403 };
  }

  const { data: restaurant, error: restoErr } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom')
    .eq('user_id', user.id)
    .maybeSingle();

  if (restoErr || !restaurant) {
    return { error: 'Restaurant introuvable', status: 404 };
  }

  return { user, restaurant, role };
}

export async function GET(request) {
  try {
    const auth = await getPartnerRestaurant(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data: transfers, error } = await supabaseAdmin
      .from('restaurant_transfers')
      .select(
        'id, amount, transfer_date, period_start, period_end, status, invoice_number, notes, created_at'
      )
      .eq('restaurant_id', auth.restaurant.id)
      .eq('status', 'completed')
      .order('transfer_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('partner transfers list:', error);
      return NextResponse.json({ error: 'Erreur chargement des paiements' }, { status: 500 });
    }

    return NextResponse.json({
      restaurant: auth.restaurant,
      transfers: transfers || [],
    });
  } catch (e) {
    console.error('partner transfers:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

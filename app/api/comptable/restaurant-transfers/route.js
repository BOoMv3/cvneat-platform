import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireFinanceAccess } from '../../../../lib/require-finance-access';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const auth = await requireFinanceAccess(request, supabaseAdmin);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    let query = supabaseAdmin
      .from('restaurant_transfers')
      .select(
        'id, restaurant_id, restaurant_name, amount, transfer_date, reference_number, period_start, period_end, invoice_number, invoice_generated_at, status, notes, created_at'
      )
      .eq('status', 'completed')
      .order('transfer_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (restaurantId) query = query.eq('restaurant_id', restaurantId);
    if (from) query = query.gte('transfer_date', from);
    if (to) query = query.lte('transfer_date', to);

    const { data, error } = await query;
    if (error) throw error;

    let rows = data || [];
    if (q) {
      rows = rows.filter(
        (r) =>
          (r.restaurant_name || '').toLowerCase().includes(q) ||
          (r.invoice_number || '').toLowerCase().includes(q) ||
          (r.reference_number || '').toLowerCase().includes(q) ||
          (r.id || '').toLowerCase().includes(q)
      );
    }

    const total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    return NextResponse.json({
      transfers: rows,
      totalAmount: Math.round(total * 100) / 100,
      count: rows.length,
    });
  } catch (error) {
    console.error('comptable/restaurant-transfers:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

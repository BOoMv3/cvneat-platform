import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ORDERS_TO_CHECK = [
  '25bfb162-7f20-48f3-a7c5-6649cc2a5809',
  '16ee7cc4-05c0-4035-ba4a-82fc293b93c3',
];

/** GET - Vérifier le statut actuel des commandes Logan (admin uniquement) */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('sb-access-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin requis' }, { status: 403 });
    }

    const results = [];
    for (const id of ORDERS_TO_CHECK) {
      const { data: order, error } = await supabaseAdmin
        .from('commandes')
        .select('id, statut, livreur_id, restaurant_id, total, created_at')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        results.push({ id: id.slice(0, 8), error: error.message });
      } else if (order) {
        results.push({
          id: id.slice(0, 8),
          statut: order.statut,
          livreur_id: order.livreur_id ? order.livreur_id.slice(0, 8) + '...' : null,
          total: order.total,
        });
      } else {
        results.push({ id: id.slice(0, 8), error: 'Commande non trouvée' });
      }
    }

    const dbHint = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.replace('.supabase.co', '')
      : 'non configuré';

    return NextResponse.json({
      db: dbHint,
      orders: results,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 });
  }
}

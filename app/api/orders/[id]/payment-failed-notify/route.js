import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyAssignedDriver } from '@/lib/driver-search';

export const dynamic = 'force-dynamic';

/** Notifie le livreur réservé qu’un paiement a échoué / été annulé. */
export async function POST(request, { params }) {
  try {
    const orderId = params?.id;
    if (!orderId) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const {
      data: { user },
      error: authErr,
    } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: order } = await admin.from('commandes').select('*').eq('id', orderId).maybeSingle();
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    if (order.user_id && order.user_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (order.livreur_id) {
      await notifyAssignedDriver(order, {
        title: 'Paiement client échoué ⚠️',
        body: `La course #${String(order.id).slice(0, 8)} : le client n’a pas pu payer. Tu restes réservé s’il réessaie, sinon la course peut être libérée.`,
        type: 'payment_failed',
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Bascule une commande livraison (non payée) en retrait sur place :
 * frais livraison = 0, fin de recherche livreur.
 */
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

    const { data: order, error } = await admin.from('commandes').select('*').eq('id', orderId).single();
    if (error || !order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });

    if (order.user_id && order.user_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
    if (['paid', 'succeeded'].includes(String(order.payment_status || '').toLowerCase())) {
      return NextResponse.json({ error: 'Commande déjà payée' }, { status: 400 });
    }

    const articles = Math.max(0, parseFloat(order.total || 0) || 0);
    // Frais plateforme 0,49 souvent dans total_paid / hors total articles — on ne touche qu'aux frais livraison
    const { data: updated, error: updErr } = await admin
      .from('commandes')
      .update({
        order_fulfillment: 'pickup',
        frais_livraison: 0,
        frais_livraison_course: 0,
        delivery_commission_cvneat: 0,
        livreur_id: null,
        driver_search_status: 'cancelled',
        driver_search_expires_at: null,
        driver_reserved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order: updated,
      total_to_pay_hint: articles, // le PI sera recalculé côté create-payment-intent
    });
  } catch (e) {
    console.error('switch-pickup:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

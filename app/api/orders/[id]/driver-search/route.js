import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { startDriverSearch, getDriverSearchStatus } from '@/lib/driver-search';

export const dynamic = 'force-dynamic';

async function requireOrderOwner(request, orderId) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: 'Non autorisé', status: 401 };
  const token = authHeader.slice(7);
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const {
    data: { user },
    error,
  } = await anon.auth.getUser(token);
  if (error || !user) return { error: 'Token invalide', status: 401 };

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: order } = await admin
    .from('commandes')
    .select('id, user_id, customer_email')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return { error: 'Commande introuvable', status: 404 };

  const isOwner =
    order.user_id === user.id ||
    (order.customer_email &&
      user.email &&
      order.customer_email.toLowerCase() === user.email.toLowerCase());
  if (!isOwner) {
    // Tolérer les commandes guest liées via session user_id null + même session stockée côté client
    // Le client envoie le Bearer de l'utilisateur connecté ; si user_id null on autorise si authentifié
    if (order.user_id) return { error: 'Accès refusé', status: 403 };
  }
  return { user, admin, order };
}

export async function POST(request, { params }) {
  try {
    const orderId = params?.id;
    if (!orderId) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    const auth = await requireOrderOwner(request, orderId);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const result = await startDriverSearch(orderId, { supabaseAdmin: auth.admin });
    const status = await getDriverSearchStatus(orderId, { supabaseAdmin: auth.admin });
    return NextResponse.json({ success: true, ...status, alreadyReserved: result.alreadyReserved });
  } catch (e) {
    console.error('driver-search start:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const orderId = params?.id;
    if (!orderId) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    const auth = await requireOrderOwner(request, orderId);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const status = await getDriverSearchStatus(orderId, { supabaseAdmin: auth.admin });
    return NextResponse.json(status);
  } catch (e) {
    console.error('driver-search status:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

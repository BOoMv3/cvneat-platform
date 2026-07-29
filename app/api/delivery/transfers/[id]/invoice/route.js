import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadDeliveryTransferInvoice } from '@/lib/delivery-invoice';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireDelivery(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: 'Non autorisé', status: 401 };
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { error: 'Token invalide', status: 401 };

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile?.role || '').toLowerCase();
  if (!['delivery', 'livreur'].includes(role)) {
    return { error: 'Accès livreur requis', status: 403 };
  }
  return { user };
}

export async function GET(request, { params }) {
  try {
    const auth = await requireDelivery(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const data = await loadDeliveryTransferInvoice(supabaseAdmin, id);
    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: data.status || 500 });
    }

    if (data.transfer.delivery_id !== auth.user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    return new NextResponse(data.html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

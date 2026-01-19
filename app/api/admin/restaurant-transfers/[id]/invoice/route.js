import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAdminUser(request) {
  const authHeader = request.headers.get('authorization');
  const token =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

  if (!token) return { ok: false, status: 401, error: 'Token requis' };

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  const user = userRes?.user;
  if (userErr || !user) return { ok: false, status: 401, error: 'Token invalide' };

  const { data: userData, error: roleErr } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (roleErr || !userData || userData.role !== 'admin') {
    return { ok: false, status: 403, error: 'Accès admin requis' };
  }

  return { ok: true, user };
}

export async function GET(request, { params }) {
  const auth = await requireAdminUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const { data: transfer, error: transferErr } = await supabaseAdmin
    .from('restaurant_transfers')
    .select('*')
    .eq('id', id)
    .single();
  if (transferErr || !transfer) {
    return NextResponse.json({ error: 'Virement introuvable' }, { status: 404 });
  }

  // Si archivé, renvoyer directement
  if (transfer.invoice_html) {
    return new NextResponse(transfer.invoice_html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  // Sinon, fallback: rediriger vers le générateur (brouillon) basé sur période
  // (Cela n'est pas aussi fiable qu'une archive générée au moment du virement)
  const start = transfer.period_start
    ? new Date(transfer.period_start).toISOString()
    : new Date(transfer.transfer_date).toISOString();
  const end = transfer.period_end
    ? new Date(transfer.period_end).toISOString()
    : new Date(transfer.transfer_date).toISOString();

  const url = new URL(request.url);
  url.pathname = '/api/admin/invoices/restaurant';
  url.searchParams.set('restaurantId', transfer.restaurant_id);
  url.searchParams.set('start', start);
  url.searchParams.set('end', end);
  url.searchParams.set('kind', 'commission');

  return NextResponse.redirect(url);
}



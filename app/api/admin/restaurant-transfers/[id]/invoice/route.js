import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadRestaurantTransferInvoiceData } from '../../../../../../lib/restaurant-transfer-invoice-data';
import {
  buildRestaurantTransferInvoicePdfBuffer,
  invoicePdfFilename,
} from '../../../../../../lib/restaurant-invoice-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  try {
    const auth = await requireAdminUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'pdf').toLowerCase();

    const data = await loadRestaurantTransferInvoiceData(supabaseAdmin, id);
    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: data.status || 500 });
    }

    if (format === 'html') {
      return new NextResponse(data.html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    const pdfBuffer = await buildRestaurantTransferInvoicePdfBuffer({
      restaurant: data.restaurant,
      transfer: data.transfer,
      orders: data.orders,
      totals: data.totals,
      invoiceNumber: data.invoiceNumber,
    });

    const filename = invoicePdfFilename(data.invoiceNumber);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Erreur génération facture PDF:', error);
    return NextResponse.json(
      { error: 'Erreur génération facture PDF', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

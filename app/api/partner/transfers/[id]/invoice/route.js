import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadRestaurantTransferInvoiceData } from '../../../../../../lib/restaurant-transfer-invoice-data';
import {
  buildRestaurantTransferInvoicePdfBuffer,
  invoicePdfFilename,
} from '../../../../../../lib/restaurant-invoice-pdf';
import { loadCvneatInvoiceLogoForPdf } from '../../../../../../lib/invoice-pdf-logo';

export const runtime = 'nodejs';
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

export async function GET(request, { params }) {
  try {
    const auth = await getPartnerRestaurant(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const { data: transfer, error: tErr } = await supabaseAdmin
      .from('restaurant_transfers')
      .select('id, restaurant_id, status')
      .eq('id', id)
      .maybeSingle();

    if (tErr || !transfer) {
      return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 });
    }

    if (transfer.restaurant_id !== auth.restaurant.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if ((transfer.status || '').toLowerCase() !== 'completed') {
      return NextResponse.json({ error: 'Facture disponible uniquement pour un paiement effectué' }, { status: 400 });
    }

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

    const logoJpeg = await loadCvneatInvoiceLogoForPdf();
    const pdfBuffer = await buildRestaurantTransferInvoicePdfBuffer({
      restaurant: data.restaurant,
      transfer: data.transfer,
      orders: data.orders,
      totals: data.totals,
      invoiceNumber: data.invoiceNumber,
      options: { logoBuffer: logoJpeg },
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
    console.error('partner transfer invoice:', error);
    return NextResponse.json(
      { error: 'Erreur génération facture', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

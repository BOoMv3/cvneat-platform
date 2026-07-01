import { NextResponse } from 'next/server';
import {
  buildSampleRestaurantInvoiceHtml,
  buildSampleRestaurantInvoicePdfBuffer,
  SAMPLE_INVOICE_NUMBER,
} from '@/lib/restaurant-invoice-sample';
import { invoicePdfFilename } from '@/lib/restaurant-invoice-pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Facture restaurant fictive (présentation partenaires / comptables). */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'html').toLowerCase();
  const origin = new URL(request.url).origin;

  if (format === 'pdf') {
    const { loadCvneatInvoiceLogoForPdf } = await import('@/lib/invoice-pdf-logo');
    const logoJpeg = await loadCvneatInvoiceLogoForPdf();

    const pdfBuffer = await buildSampleRestaurantInvoicePdfBuffer(logoJpeg);
    const filename = invoicePdfFilename(SAMPLE_INVOICE_NUMBER);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  const html = buildSampleRestaurantInvoiceHtml(origin);

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

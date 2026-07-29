import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadDeliveryTransferInvoice } from '../../../../../../lib/delivery-invoice';
import { requireFinanceAccess } from '../../../../../../lib/require-finance-access';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  const auth = await requireFinanceAccess(request, supabaseAdmin);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const data = await loadDeliveryTransferInvoice(supabaseAdmin, id);
  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: data.status || 500 });
  }

  return new NextResponse(data.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

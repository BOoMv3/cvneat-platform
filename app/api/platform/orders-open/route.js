import { NextResponse } from 'next/server';
import { isOrdersClosed } from '@/lib/ordersClosed';

export async function GET() {
  const closed = isOrdersClosed();
  return NextResponse.json({
    open: !closed,
    message: closed
      ? 'Maintenance en cours. Les commandes sont temporairement indisponibles.'
      : null,
  });
}

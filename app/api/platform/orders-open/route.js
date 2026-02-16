import { NextResponse } from 'next/server';
import { isOrdersClosed } from '@/lib/ordersClosed';

export async function GET() {
  const closed = isOrdersClosed();
  return NextResponse.json({
    open: !closed,
    message: closed
      ? 'Pas de commande ce midi.'
      : null,
  });
}

import { NextResponse } from 'next/server';
import { generateDeliverySlotOptions } from '@/lib/delivery-slots';

export async function GET() {
  return NextResponse.json({
    slots: generateDeliverySlotOptions(),
    timezone: 'Europe/Paris',
    stepMinutes: 30,
  });
}

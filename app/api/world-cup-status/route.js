import { NextResponse } from 'next/server';
import { isWorldCupModeEnabled } from '@/lib/world-cup-campaign';

export async function GET() {
  return NextResponse.json({ enabled: isWorldCupModeEnabled() });
}

import { NextResponse } from 'next/server';
import {
  getMaintenanceMessage,
  isSiteMaintenanceEnabled,
} from '@/lib/site-maintenance';

export async function GET() {
  return NextResponse.json({
    maintenance: isSiteMaintenanceEnabled(),
    message: getMaintenanceMessage(),
  });
}

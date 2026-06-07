import { NextResponse } from 'next/server';
import {
  getMaintenanceMessage,
  isApiAllowedDuringMaintenance,
  isPageAllowedDuringMaintenance,
  isSiteMaintenanceEnabled,
} from './lib/site-maintenance';

export function middleware(request) {
  if (!isSiteMaintenanceEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const method = request.method;

  if (pathname.startsWith('/api/')) {
    if (isApiAllowedDuringMaintenance(pathname, method)) {
      return NextResponse.next();
    }

    return NextResponse.json(
      {
        error: 'Service temporairement indisponible',
        maintenance: true,
        message: getMaintenanceMessage(),
      },
      { status: 503 }
    );
  }

  if (isPageAllowedDuringMaintenance(pathname)) {
    return NextResponse.next();
  }

  if (pathname === '/maintenance') {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/maintenance';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

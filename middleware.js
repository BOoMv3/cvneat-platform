import { NextResponse } from 'next/server';

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  
  const adminPartnerRoutes = [
    '/admin',
    '/partner',
    '/profil-partenaire',
    '/restaurant-request',
    '/devenir-partenaire',
    '/login',
    '/delivery'
  ];
  
  const isAdminPartnerRoute = adminPartnerRoutes.some(route => pathname.startsWith(route));
  
  if (isAdminPartnerRoute) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }
  
  const alwaysAllowedRoutes = [
    '/api',
    '/auth',
    '/auth/confirm',
    '/auth/update-password',
    '/_next',
    '/static',
    '/favicon.ico',
    '/maintenance',
    '/track-order',
    '/profile',
    '/panier',
    '/checkout',
    '/restaurants'
  ];
  
  if (alwaysAllowedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  const maintenanceEnv = process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
  const isMaintenanceMode = maintenanceEnv === 'true' || maintenanceEnv === true;
  
  if (!isMaintenanceMode) {
    return NextResponse.next();
  }
  
  if (pathname === '/inscription' || pathname === '/register') {
    const response = NextResponse.redirect(new URL('/maintenance', request.url));
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  }
  
  if (pathname === '/') {
    const response = NextResponse.redirect(new URL('/maintenance', request.url));
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};


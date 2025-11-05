import { NextResponse } from 'next/server';

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  
  // Routes admin/partner - TOUJOURS autorisées (PRIORITÉ ABSOLUE)
  // Vérifier EN PREMIER pour éviter toute redirection, même en maintenance
  const adminPartnerRoutes = [
    '/admin',
    '/partner',
    '/profil-partenaire',
    '/restaurant-request',
    '/devenir-partenaire',
    '/login',
    '/delivery'
  ];
  
  // Vérifier si la route commence par une des routes admin/partner
  const isAdminPartnerRoute = adminPartnerRoutes.some(route => pathname.startsWith(route));
  
  if (isAdminPartnerRoute) {
    // Autoriser sans redirection - Ajouter des headers pour éviter le cache
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }
  
  // Routes toujours autorisées (même en maintenance)
  const alwaysAllowedRoutes = [
    '/api',
    '/auth',
    '/_next',
    '/static',
    '/favicon.ico',
    '/maintenance',
    '/track-order',
    '/profile',
    '/panier',
    '/checkout'
  ];
  
  if (alwaysAllowedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Vérifier si le mode maintenance est activé (seulement après avoir vérifié les routes admin/partner)
  const maintenanceEnv = process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
  const isMaintenanceMode = maintenanceEnv === 'true' || maintenanceEnv === true;
  
  // Si le mode maintenance n'est pas activé, laisser passer TOUT
  if (!isMaintenanceMode) {
    return NextResponse.next();
  }
  
  // Routes d'inscription client - BLOQUÉES en mode maintenance
  if (pathname === '/inscription' || pathname === '/register') {
    const response = NextResponse.redirect(new URL('/maintenance', request.url));
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  }
  
  // Routes publiques client - Rediriger vers maintenance
  // Seulement si ce n'est PAS une route admin/partner (déjà vérifiée plus haut)
  if (pathname === '/' || pathname.startsWith('/restaurants/')) {
    const response = NextResponse.redirect(new URL('/maintenance', request.url));
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  }
  
  // Pour toutes les autres routes, laisser passer (pour éviter les boucles)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

import { NextResponse } from 'next/server';

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  
  // Vérifier si le mode maintenance est activé
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  
  // Si le mode maintenance n'est pas activé, laisser passer TOUT
  if (!isMaintenanceMode) {
    return NextResponse.next();
  }
  
  // Routes admin/partner - TOUJOURS autorisées en maintenance (PRIORITÉ ABSOLUE)
  // Vérifier EN PREMIER pour éviter toute redirection
  const adminPartnerRoutes = [
    '/admin',
    '/partner',
    '/profil-partenaire',
    '/restaurant-request',
    '/devenir-partenaire',
    '/login' // Permettre la connexion pour admin/partner
  ];
  
  // Vérifier si la route commence par une des routes admin/partner
  const isAdminPartnerRoute = adminPartnerRoutes.some(route => pathname.startsWith(route));
  
  if (isAdminPartnerRoute) {
    console.log('✅ Middleware: Route admin/partner autorisée:', pathname);
    return NextResponse.next();
  }
  
  // Routes toujours autorisées (même en maintenance)
  const alwaysAllowedRoutes = [
    '/api',
    '/auth',
    '/_next',
    '/static',
    '/favicon.ico',
    '/maintenance'
  ];
  
  if (alwaysAllowedRoutes.some(route => pathname.startsWith(route))) {
    console.log('✅ Middleware: Route toujours autorisée:', pathname);
    return NextResponse.next();
  }
  
  // Routes d'inscription client - BLOQUÉES en mode maintenance
  if (pathname === '/inscription' || pathname === '/register') {
    console.log('🚫 Middleware: Route inscription bloquée:', pathname);
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }
  
  // Routes publiques client - Rediriger vers maintenance
  // Seulement si ce n'est PAS une route admin/partner (déjà vérifiée plus haut)
  if (pathname === '/' || pathname.startsWith('/restaurants/')) {
    console.log('🚫 Middleware: Route publique redirigée vers maintenance:', pathname);
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }
  
  // Pour toutes les autres routes, laisser passer (pour éviter les boucles)
  console.log('⚠️ Middleware: Route non gérée, laissée passer:', pathname);
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

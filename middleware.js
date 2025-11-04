import { NextResponse } from 'next/server';

export function middleware(request) {
  // Vérifier si le mode maintenance est activé
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  
  // Routes autorisées même en mode maintenance (pour les restaurants/partenaires uniquement)
  const allowedRoutes = [
    '/login',
    '/restaurant-request',  // Demande de devenir partenaire (pour les restaurants)
    '/devenir-partenaire', // Alternative pour devenir partenaire
    '/partner',
    '/partner/dashboard',
    '/partner/hours',
    '/partner/menu',
    '/partner/profile',
    '/profil-partenaire',
    '/api',
    '/auth',
    '/_next',
    '/static',
    '/favicon.ico',
    '/maintenance'
  ];
  
  // Routes d'inscription client - BLOQUÉES en mode maintenance
  const blockedClientRoutes = [
    '/inscription',
    '/register'
  ];
  
  // Si c'est une route d'inscription client, rediriger vers maintenance
  if (isMaintenanceMode && blockedClientRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }
  
  // Vérifier si la route actuelle est autorisée
  const isAllowedRoute = allowedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );
  
  // Si le mode maintenance est activé
  if (isMaintenanceMode) {
    // Si c'est la page d'accueil ou une route publique, rediriger vers maintenance
    if (request.nextUrl.pathname === '/' || (!isAllowedRoute && !request.nextUrl.pathname.startsWith('/api'))) {
      // Ne pas rediriger si c'est déjà la page de maintenance
      if (!request.nextUrl.pathname.startsWith('/maintenance')) {
        return NextResponse.redirect(new URL('/maintenance', request.url));
      }
    }
    // Sinon, laisser passer (routes autorisées)
    return NextResponse.next();
  }
  
  // Mode maintenance désactivé : tout fonctionne normalement
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

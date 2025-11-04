import { NextResponse } from 'next/server';

export function middleware(request) {
  // Vérifier si le mode maintenance est activé
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  
  // Routes autorisées même en mode maintenance (pour les restaurants/partenaires)
  const allowedRoutes = [
    '/login',
    '/inscription',
    '/register',
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

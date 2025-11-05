import { NextResponse } from 'next/server';

export function middleware(request) {
  // Vérifier si le mode maintenance est activé
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  
  // Si le mode maintenance n'est pas activé, laisser passer
  if (!isMaintenanceMode) {
    return NextResponse.next();
  }
  
  // Routes toujours autorisées (même en maintenance)
  const alwaysAllowedRoutes = [
    '/api',
    '/auth',
    '/_next',
    '/static',
    '/favicon.ico',
    '/maintenance',
    '/login'
  ];
  
  // Vérifier si c'est une route toujours autorisée
  const isAlwaysAllowed = alwaysAllowedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );
  
  if (isAlwaysAllowed) {
    return NextResponse.next();
  }
  
  // Routes admin/partner - Laisser passer (les pages vérifieront l'auth elles-mêmes)
  const adminPartnerRoutes = [
    '/admin',
    '/partner',
    '/profil-partenaire',
    '/restaurant-request',
    '/devenir-partenaire'
  ];
  
  const isAdminPartnerRoute = adminPartnerRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );
  
  // Autoriser l'accès aux routes admin/partner (les pages géreront l'auth)
  if (isAdminPartnerRoute) {
    return NextResponse.next();
  }
  
  // Routes d'inscription client - BLOQUÉES en mode maintenance
  const blockedClientRoutes = [
    '/inscription',
    '/register'
  ];
  
  if (blockedClientRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }
  
  // Pour toutes les autres routes (page d'accueil, restaurants, etc.), rediriger vers maintenance
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/restaurants')) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }
  
  // Laisser passer les autres routes (pour éviter les boucles)
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

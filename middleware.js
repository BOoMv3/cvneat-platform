import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request) {
  // Liste des routes publiques
  const publicRoutes = [
    '/',
    '/login', 
    '/inscription',
    '/register',
    '/api/auth/login',
    '/api/auth/register',
    '/api/restaurants',
    '/api/restaurants/[id]',
    '/api/menu/[id]'
  ];
  
  // Vérifier si la route actuelle est publique
  const isPublicRoute = publicRoutes.some(route => {
    if (route.includes('[') && route.includes(']')) {
      // Route dynamique - vérifier le pattern
      const pattern = route.replace(/\[.*?\]/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(request.nextUrl.pathname);
    }
    return request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route);
  });

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Récupérer le token du cookie ou header Authorization
  let token = request.cookies.get('token')?.value;
  
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Vérifier le token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    // Vérifier l'expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Ajouter les infos utilisateur aux headers pour les API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId || '');
    requestHeaders.set('x-user-role', payload.role || '');
    requestHeaders.set('x-user-email', payload.email || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Erreur de vérification du token:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Configuration des routes à protéger
export const config = {
  matcher: [
    '/admin/:path*',
    '/delivery/:path*',
    '/restaurants/:path*',
    '/profile/:path*',
    '/checkout/:path*',
    '/api/admin/:path*',
    '/api/delivery/:path*',
    '/api/partner/:path*',
    '/api/orders/:path*',
    '/api/users/:path*',
    '/api/notifications/:path*',
    '/api/payment/:path*'
  ]
};

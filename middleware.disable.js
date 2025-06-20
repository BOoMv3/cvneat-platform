import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request) {
  // Liste des routes publiques
  const publicRoutes = ['/login', '/inscription', '/'];
  
  // Vérifier si la route actuelle est publique
  if (publicRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Récupérer le token du cookie
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Vérifier le token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);

    return NextResponse.next();
  } catch (error) {
    // Si le token est invalide, rediriger vers la page de connexion
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Configuration des routes à protéger
export const config = {
  matcher: [
    '/profile/:path*',
    '/checkout/:path*',
    '/admin/:path*',
    '/restaurant/:path*'
  ]
}; 
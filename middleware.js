import { NextResponse } from 'next/server';

/**
 * Empêche CDN / navigateur de servir une vieille coque HTML pour les tableaux de bord
 * (sinon layouts Next récents — ex. bandeau admin — n’apparaissent pas).
 */
export function middleware(request) {
  const res = NextResponse.next();
  const p = request.nextUrl.pathname;

  if (
    p.startsWith('/admin') ||
    p.startsWith('/partner') ||
    p.startsWith('/restaurant')
  ) {
    res.headers.set(
      'Cache-Control',
      'private, no-store, no-cache, must-revalidate, max-age=0',
    );
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};


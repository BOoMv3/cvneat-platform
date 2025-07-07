import { NextResponse } from 'next/server';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();

  // Récupérer le chemin de la requête
  const pathname = req.nextUrl.pathname;

  // Si l'utilisateur n'est pas connecté
  if (!user) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/partner')) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return res;
  }

  // Récupérer le rôle depuis le profil utilisateur (table users)
  let userRole = null;
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    userRole = userData?.role || 'user';
  } catch (e) {
    userRole = 'user';
  }

  // Protection des routes admin
  if (pathname.startsWith('/admin') && !userRole.includes('admin')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Protection des routes partenaire
  if (pathname.startsWith('/partner') && !userRole.match(/(partner|admin)/)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/partner/:path*'],
}; 
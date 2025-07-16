import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(req) {
  const res = NextResponse.next();
  
  // Créer le client Supabase pour le middleware
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Récupérer le token depuis les cookies
  const token = req.cookies.get('sb-access-token')?.value || 
                req.cookies.get('supabase-auth-token')?.value;

  let user = null;
  if (token) {
    try {
      const { data: { user: userData } } = await supabase.auth.getUser(token);
      user = userData;
    } catch (error) {
      console.error('Erreur vérification token:', error);
    }
  }

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
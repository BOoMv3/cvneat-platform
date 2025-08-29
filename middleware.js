import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    // Vérifier l'authentification
    const { data: { user }, error } = await supabase.auth.getUser()

    // Routes publiques qui ne nécessitent pas d'authentification
    const publicRoutes = ['/', '/login', '/register', '/restaurants', '/cgv', '/mentions-legales', '/politique-confidentialite']
    const isPublicRoute = publicRoutes.some(route => req.nextUrl.pathname.startsWith(route))

    if (isPublicRoute) {
      return res
    }

    // Routes qui nécessitent une authentification
    if (!user && !isPublicRoute) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Vérifier les rôles pour les routes sensibles
    if (user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = userProfile?.role || 'user'

      // Routes admin
      if (req.nextUrl.pathname.startsWith('/admin') && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url))
      }

      // Routes partner
      if (req.nextUrl.pathname.startsWith('/partner') && userRole !== 'restaurant') {
        return NextResponse.redirect(new URL('/', req.url))
      }

      // Routes delivery
      if (req.nextUrl.pathname.startsWith('/delivery') && userRole !== 'delivery') {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // En cas d'erreur, rediriger vers la page d'accueil
    return NextResponse.redirect(new URL('/', req.url))
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/partner/:path*',
    '/delivery/:path*',
    '/profile/:path*',
    '/checkout/:path*',
    '/panier/:path*'
  ]
} 
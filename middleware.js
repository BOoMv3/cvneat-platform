import { NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** POST de consultation (pas de mutation) — autorisés en lecture associée. */
const READ_LIKE_POST_PREFIXES = [
  '/api/admin/users/search',
  '/api/admin/sirene/search',
  '/api/admin/restaurants/price-markup-preview',
  '/api/admin/newsletter/export-emails',
  '/api/admin/newsletter/export-sms',
  '/api/admin/orders/check-status',
];

async function resolveRoleFromToken(token) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !token) return null;

  const userRes = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: serviceKey,
    },
  });
  if (!userRes.ok) return null;
  const user = await userRes.json().catch(() => null);
  const uid = user?.id;
  if (!uid) return null;

  const roleRes = await fetch(`${url}/rest/v1/users?id=eq.${uid}&select=role`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!roleRes.ok) return null;
  const rows = await roleRes.json().catch(() => []);
  return (rows?.[0]?.role || '').toString().trim().toLowerCase() || null;
}

export async function middleware(request) {
  const method = request.method.toUpperCase();
  if (SAFE_METHODS.has(method)) return NextResponse.next();

  const path = request.nextUrl.pathname;
  if (READ_LIKE_POST_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  // Sans token: laisser la route répondre 401
  if (!token) return NextResponse.next();

  try {
    const role = await resolveRoleFromToken(token);
    if (role === 'associe') {
      return NextResponse.json(
        {
          error:
            'Lecture seule : le compte associé ne peut rien modifier (virements, messages, etc.).',
        },
        { status: 403 }
      );
    }
  } catch {
    // En cas d’erreur réseau, les checks des routes restent la 2ᵉ ligne de défense
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/api/delivery/dm/:path*'],
};

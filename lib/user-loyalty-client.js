import { supabase } from './supabase';

/**
 * Points et rôle via GET /api/loyalty/points (lecture service role après vérif. JWT).
 * À utiliser côté client à la place d’un .from('users').select('points_fidelite') direct,
 * lorsque la RLS ou le timing de session empêche une lecture fiable.
 */
export async function fetchMyLoyaltyFromApi() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, points: 0, role: null };
  }
  const res = await fetch('/api/loyalty/points', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });
  const raw = await res.text();
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return { ok: false, points: 0, role: null };
  }
  if (!res.ok) {
    return { ok: false, points: 0, role: null, error: body?.error || String(res.status) };
  }
  const points = Math.max(0, parseInt(String(body.points ?? 0), 10) || 0);
  const role = body.role != null ? String(body.role).trim() : null;
  return { ok: true, points, role };
}

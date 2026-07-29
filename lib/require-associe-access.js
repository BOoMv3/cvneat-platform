import { createClient } from '@supabase/supabase-js';

/**
 * Accès associé (semi-admin) : lecture seule.
 * Admin a aussi accès (pour tests).
 * Fallback metadata Auth si la ligne `users` n'existe pas encore (migration role CHECK en attente).
 */
export async function requireAssocieOrAdmin(request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const authHeader = request.headers.get('authorization');
  const token =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;
  if (!token) return { ok: false, status: 401, error: 'Token requis' };

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  const user = userRes?.user;
  if (userErr || !user) return { ok: false, status: 401, error: 'Token invalide' };

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, role, email, prenom, nom')
    .eq('id', user.id)
    .maybeSingle();

  const metaRole = (
    user.user_metadata?.role ||
    user.app_metadata?.role ||
    ''
  )
    .toString()
    .trim()
    .toLowerCase();

  const role = (profile?.role || metaRole || '').toString().trim().toLowerCase();
  if (role !== 'associe' && role !== 'admin') {
    return { ok: false, status: 403, error: 'Accès associé requis' };
  }

  return {
    ok: true,
    user,
    role,
    profile: profile || {
      id: user.id,
      email: user.email,
      prenom: user.user_metadata?.prenom || 'Roméo',
      nom: user.user_metadata?.nom || 'Associé',
      role,
    },
    readOnly: role === 'associe',
    supabaseAdmin,
  };
}

/**
 * Accès lecture finance : admin + comptable.
 * Écriture (virements, etc.) : admin uniquement.
 */
export async function resolveFinanceRole(supabaseAdmin, user) {
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role, email, prenom, nom')
    .eq('id', user.id)
    .maybeSingle();

  const dbRole = (profile?.role || '').toString().trim().toLowerCase();
  const metaRole = (user.user_metadata?.role || '').toString().trim().toLowerCase();
  const email = (user.email || profile?.email || '').toString().trim().toLowerCase();

  let role = dbRole;
  if (!role || role === 'user') {
    if (metaRole === 'comptable') role = 'comptable';
    else if (email === 'comptable@cvneat.fr') role = 'comptable';
  }

  return { role, profile: profile || { email: user.email, prenom: '', nom: '' } };
}

export async function requireFinanceAccess(request, supabaseAdmin, { write = false } = {}) {
  const authHeader = request.headers.get('authorization');
  const token =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

  if (!token) return { ok: false, status: 401, error: 'Token requis' };

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  const user = userRes?.user;
  if (userErr || !user) return { ok: false, status: 401, error: 'Token invalide' };

  const { role, profile } = await resolveFinanceRole(supabaseAdmin, user);
  const canRead = role === 'admin' || role === 'comptable';
  const canWrite = role === 'admin';

  if (write && !canWrite) {
    return { ok: false, status: 403, error: 'Accès admin requis pour cette action' };
  }
  if (!write && !canRead) {
    return { ok: false, status: 403, error: 'Accès comptabilité requis' };
  }

  return { ok: true, user, role, profile };
}

import { createClient } from '@supabase/supabase-js';
import {
  isAdminViewerRole,
  isAdminWriterRole,
  isAdminReadOnlyRole,
  normalizeStaffRole,
} from './admin-viewer';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Accès interface / API admin.
 * @param {{ write?: boolean }} opts - write=true → admin only ; sinon admin|associe
 */
export async function requireAdminAccess(request, { write = false } = {}) {
  const supabaseAdmin = getServiceClient();
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

  const metaRole = normalizeStaffRole(
    user.user_metadata?.role || user.app_metadata?.role || ''
  );
  const role = normalizeStaffRole(profile?.role || metaRole);

  if (write) {
    if (!isAdminWriterRole(role)) {
      return {
        ok: false,
        status: 403,
        error: 'Lecture seule : seuls les admins peuvent modifier',
      };
    }
  } else if (!isAdminViewerRole(role)) {
    return { ok: false, status: 403, error: 'Accès non autorisé' };
  }

  return {
    ok: true,
    user,
    role,
    profile: profile || {
      id: user.id,
      email: user.email,
      prenom: user.user_metadata?.prenom || '',
      nom: user.user_metadata?.nom || '',
      role,
    },
    readOnly: isAdminReadOnlyRole(role),
    supabaseAdmin,
  };
}

export { isAdminViewerRole, isAdminWriterRole, isAdminReadOnlyRole, normalizeStaffRole };

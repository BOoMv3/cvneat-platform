import { supabaseAdmin } from './supabase';

export function getAuthRedirectBase() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://www.cvneat.fr';
  return raw.replace(/\/$/, '');
}

/**
 * Génère un lien Supabase (signup, recovery, etc.) via l'API admin.
 * @param {'signup' | 'recovery' | 'magiclink' | 'invite'} type
 * @param {string} email
 * @param {string} redirectTo
 */
export async function generateAuthActionLink(type, email, redirectTo) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin non configuré (SUPABASE_SERVICE_ROLE_KEY manquante)');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type,
    email: normalizedEmail,
    options: { redirectTo },
  });

  if (error) {
    throw new Error(error.message || 'Erreur génération du lien');
  }

  const actionUrl = data?.properties?.action_link || data?.action_link || null;

  if (!actionUrl) {
    throw new Error('Impossible de récupérer le lien d\'action Supabase');
  }

  return actionUrl;
}

/**
 * Lien de réinitialisation direct sur cvneat.fr (token_hash), plus fiable que action_link seul
 * (évite perte du hash, scanners email, redirect Supabase mal configuré).
 */
export async function generatePasswordRecoveryUrl(email) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin non configuré (SUPABASE_SERVICE_ROLE_KEY manquante)');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const base = getAuthRedirectBase();
  const redirectTo = `${base}/auth/update-password`;

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: normalizedEmail,
    options: { redirectTo },
  });

  if (error) {
    throw new Error(error.message || 'Erreur génération du lien recovery');
  }

  const tokenHash = data?.properties?.hashed_token;
  if (tokenHash) {
    const params = new URLSearchParams({
      token_hash: tokenHash,
      type: 'recovery',
    });
    return `${redirectTo}?${params.toString()}`;
  }

  const actionUrl = data?.properties?.action_link || data?.action_link;
  if (actionUrl) {
    return actionUrl;
  }

  throw new Error('Impossible de récupérer le lien de réinitialisation');
}

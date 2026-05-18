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

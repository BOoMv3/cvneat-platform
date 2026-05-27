import { supabaseAdmin } from './supabase';

/**
 * Recherche un utilisateur Supabase Auth par email (pagination admin).
 */
export async function findAuthUserByEmail(email) {
  if (!supabaseAdmin) return null;
  const target = String(email || '').trim().toLowerCase();
  if (!target) return null;

  let page = 1;
  const perPage = 200;

  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message || 'Impossible de lister les comptes');
    }
    const users = data?.users || [];
    const found = users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

/**
 * Réinitialise le mot de passe via token_hash (email recovery), côté serveur.
 * Évite les échecs PKCE / navigateurs in-app / scanners qui consomment le lien.
 */
export async function completePasswordResetWithTokenHash({
  tokenHash,
  password,
  type = 'recovery',
}) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin non configuré');
  }

  const hash = String(tokenHash || '').trim();
  if (!hash) {
    throw new Error('Lien incomplet. Redemandez un email.');
  }

  const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
    token_hash: hash,
    type,
  });

  if (verifyError) {
    const msg = (verifyError.message || '').toLowerCase();
    if (msg.includes('expired') || msg.includes('invalid') || msg.includes('used')) {
      throw new Error(
        'Lien expiré ou déjà utilisé. Demandez un nouvel email (un seul clic sur le lien, pas de prévisualisation).'
      );
    }
    throw new Error(verifyError.message || 'Lien invalide.');
  }

  const userId = verifyData?.user?.id || verifyData?.session?.user?.id;
  if (!userId) {
    throw new Error('Impossible d’identifier le compte. Redemandez un email.');
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password,
  });

  if (updateError) {
    throw new Error(updateError.message || 'Impossible de mettre à jour le mot de passe.');
  }

  return { userId, email: verifyData?.user?.email || null };
}

/**
 * Établit une session Supabase à partir du lien reçu par email (hash #... ou ?code=...).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ ok: boolean; type?: string; error?: string }>}
 */
export async function establishSessionFromAuthUrl(supabase) {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Environnement navigateur requis.' };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return {
        ok: false,
        error: 'Lien invalide ou expiré. Demandez un nouvel email.',
      };
    }
    window.history.replaceState({}, document.title, window.location.pathname);
    return { ok: true, type: searchParams.get('type') || undefined };
  }

  const hash = window.location.hash;
  const hashParams = hash && hash.length > 1 ? new URLSearchParams(hash.substring(1)) : null;
  const tokenParams = hashParams ?? searchParams;

  if (tokenParams?.has('access_token') && tokenParams.has('refresh_token')) {
    const type = tokenParams.get('type') || undefined;
    const { error } = await supabase.auth.setSession({
      access_token: tokenParams.get('access_token'),
      refresh_token: tokenParams.get('refresh_token'),
    });

    if (error) {
      return {
        ok: false,
        error: 'Impossible de valider le lien. Il a peut-être expiré.',
      };
    }

    window.history.replaceState({}, document.title, window.location.pathname);
    return { ok: true, type };
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    return { ok: false, error: 'Erreur de session. Réessayez.' };
  }

  if (session) {
    return { ok: true };
  }

  return {
    ok: false,
    error: 'Lien invalide ou expiré. Demandez un nouvel email depuis la page « Mot de passe oublié ».',
  };
}

/**
 * Établit une session Supabase à partir du lien reçu par email (hash #..., ?code=..., ?token_hash=...).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ ok: boolean; type?: string; error?: string }>}
 */
export async function establishSessionFromAuthUrl(supabase) {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Environnement navigateur requis.' };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const hashParams = hash && hash.length > 1 ? new URLSearchParams(hash.substring(1)) : null;

  const urlError =
    searchParams.get('error_description') ||
    searchParams.get('error') ||
    hashParams?.get('error_description') ||
    hashParams?.get('error');
  if (urlError) {
    return {
      ok: false,
      error:
        'Lien invalide ou déjà utilisé. Demandez un nouvel email (un seul clic sur le lien).',
    };
  }

  const tokenHash = searchParams.get('token_hash') || hashParams?.get('token_hash');
  const otpType = searchParams.get('type') || hashParams?.get('type') || 'recovery';

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) {
      console.error('verifyOtp token_hash:', error.message);
      return {
        ok: false,
        error:
          'Lien expiré ou déjà utilisé. Redemandez un email sur « Mot de passe oublié » (vérifiez les spams).',
      };
    }
    window.history.replaceState({}, document.title, window.location.pathname);
    return { ok: true, type: otpType };
  }

  const code = searchParams.get('code');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('exchangeCodeForSession:', error.message);
      return {
        ok: false,
        error: 'Lien invalide ou expiré. Demandez un nouvel email.',
      };
    }
    window.history.replaceState({}, document.title, window.location.pathname);
    return { ok: true, type: searchParams.get('type') || undefined };
  }

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
    return { ok: true, type: otpType };
  }

  return {
    ok: false,
    error: 'Lien invalide ou expiré. Demandez un nouvel email depuis la page « Mot de passe oublié ».',
  };
}

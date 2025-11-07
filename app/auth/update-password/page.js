'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

const parseHashParams = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const hash = window.location.hash;
  if (!hash || hash.length < 2) {
    return null;
  }
  return new URLSearchParams(hash.substring(1));
};

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    const initialiseSession = async () => {
      try {
        const hashParams = parseHashParams();

        if (hashParams && hashParams.has('access_token') && hashParams.has('refresh_token')) {
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (type && type !== 'recovery') {
            setError("Ce lien n'est pas prévu pour une réinitialisation de mot de passe.");
            setLoading(false);
            return;
          }

          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError('Impossible de valider le lien de réinitialisation. Il a peut-être expiré.');
            setLoading(false);
            return;
          }

          // Nettoyer l'URL pour retirer les tokens du hash
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        const {
          data: { session },
          error: getSessionError,
        } = await supabase.auth.getSession();

        if (getSessionError) {
          setError('Erreur lors de la récupération de la session. Veuillez redemander un lien.');
          setLoading(false);
          return;
        }

        if (!session) {
          setError('Lien invalide ou expiré. Veuillez recommencer la procédure depuis CVN\'EAT.');
          setLoading(false);
          return;
        }

        if (active) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Erreur initialisation reset password:', err);
        if (active) {
          setError('Une erreur inattendue est survenue. Veuillez redemander un lien.');
          setLoading(false);
        }
      }
    };

    initialiseSession();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!password || password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        console.error('Erreur updateUser:', updateError);
        if (updateError.message?.toLowerCase().includes('token')) {
          setError('Le lien a expiré. Veuillez recommencer la procédure depuis CVN\'EAT.');
        } else if (updateError.message) {
          setError(`Erreur Supabase : ${updateError.message}`);
        } else {
          setError("Impossible de mettre à jour le mot de passe. Veuillez réessayer.");
        }
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);

      // Nettoyer la session pour éviter de laisser l'utilisateur connecté automatiquement
      await supabase.auth.signOut();

      setTimeout(() => {
        router.push('/login?reset=success');
      }, 2500);
    } catch (err) {
      console.error('Exception submit reset password:', err);
      setError("Une erreur inattendue est survenue. Veuillez réessayer.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Réinitialiser votre mot de passe</h1>
          <p className="text-sm text-gray-600 mt-2">
            Choisissez un nouveau mot de passe pour continuer à utiliser CVN'EAT.
          </p>
        </div>

        {loading && (
          <div className="text-center text-gray-600">
            <p>Vérification du lien en cours…</p>
          </div>
        )}

        {!loading && success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            Mot de passe mis à jour avec succès ! Vous allez être redirigé vers la page de connexion…
          </div>
        )}

        {!loading && !success && (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                id="password"
                name="password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                placeholder="Au moins 8 caractères"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                placeholder="Retapez le mot de passe"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {submitting ? 'Mise à jour…' : 'Confirmer'}
            </button>

            <div className="text-center text-xs text-gray-500">
              Besoin d'aide ? Contactez le support à
              {' '}
              <Link href="mailto:support@cvneat.fr" className="text-indigo-600 font-medium">
                support@cvneat.fr
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


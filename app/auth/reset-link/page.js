'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const tokenHash = useMemo(() => searchParams.get('token_hash')?.trim() || '', [searchParams]);
  const linkType = useMemo(() => searchParams.get('type')?.trim() || 'recovery', [searchParams]);

  useEffect(() => {
    if (!tokenHash) {
      setError(
        'Lien incomplet ou expiré. Retournez sur « Mot de passe oublié » pour recevoir un nouvel email.'
      );
    }
  }, [tokenHash]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!tokenHash) {
      setError('Lien invalide. Redemandez un email.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/complete-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_hash: tokenHash,
          type: linkType,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Impossible de mettre à jour le mot de passe.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);
      setTimeout(() => {
        router.replace('/login?reset=success');
      }, 2200);
    } catch (err) {
      console.error('reset-link submit:', err);
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
          <p className="text-sm text-gray-600 mt-2">
            Choisissez un mot de passe sécurisé (8 caractères min., majuscule, minuscule, chiffre et
            symbole).
          </p>
        </div>

        {!tokenHash && error && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
            <Link
              href="/auth/forgot-password"
              className="block w-full text-center py-3 rounded-xl text-white font-semibold bg-blue-600 hover:bg-blue-700"
            >
              Demander un nouveau lien
            </Link>
          </div>
        )}

        {tokenHash && success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm text-center">
            Mot de passe enregistré ! Redirection vers la connexion…
          </div>
        )}

        {tokenHash && !success && (
          <>
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-xs mb-5">
              <strong>Important :</strong> ne prévisualisez pas le lien dans votre app mail. Cliquez une
              seule fois, puis remplissez le formulaire ci-dessous (Safari ou Chrome de préférence).
            </div>

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
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmer
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60"
              >
                {submitting ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-gray-500">
              <Link href="/auth/forgot-password" className="text-indigo-600 font-medium">
                Renvoyer un email
              </Link>
              {' · '}
              <Link href="mailto:contact@cvneat.fr" className="text-indigo-600 font-medium">
                contact@cvneat.fr
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function getRedirectBase() {
  // Toujours utiliser l'URL du site en prod pour que Supabase accepte le redirect
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cvneat.fr';
  return base.replace(/\/$/, '');
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const normalizedEmail = String(email).trim().toLowerCase();
      const redirectTo = `${getRedirectBase()}/auth/update-password`;

      const { error: err } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (err) {
        // Pour des raisons de sécurité, Supabase ne révèle pas si l'email existe ou non
        // On affiche un message générique en cas d'erreur
        if (err.message?.includes('rate limit') || err.message?.includes('Too many')) {
          setError('Trop de tentatives. Réessayez dans quelques minutes.');
        } else if (err.message?.includes('Invalid') || err.message?.includes('invalid')) {
          setError('Adresse email invalide. Vérifiez et réessayez.');
        } else {
          setError(err.message || 'Une erreur est survenue. Réessayez plus tard.');
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error('Erreur reset password:', err);
      setError('Une erreur inattendue est survenue. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          Mot de passe oublié
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Entrez votre adresse email pour recevoir un lien de réinitialisation.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">
                Un email vous a été envoyé. Cliquez sur le lien pour réinitialiser votre mot de passe.
                Pensez à vérifier vos spams si vous ne le voyez pas.
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  Retour à la connexion
                </Link>
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adresse email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email?.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

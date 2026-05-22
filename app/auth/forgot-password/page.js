'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email?.trim()) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue. Réessayez plus tard.');
        setLoading(false);
        return;
      }

      setSuccessMessage(
        data.message ||
          'Si un compte existe avec cette adresse, vous recevrez un email avec un lien pour choisir un nouveau mot de passe.'
      );
      setSuccess(true);
    } catch (err) {
      console.error('Erreur reset password:', err);
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.');
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
          Entrez l&apos;email de votre compte CVN&apos;Eat. Nous vous enverrons un lien sécurisé
          (depuis <strong>contact@cvneat.fr</strong>).
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded">
                {successMessage}
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-5 space-y-1">
                <li>Vérifiez votre boîte de réception et les <strong>spams / courriers indésirables</strong>.</li>
                <li>Le lien expire après environ 1 heure — <strong>un seul clic</strong> (ne pas prévisualiser le lien dans l&apos;app mail).</li>
                <li>Utilisez la même adresse email que lors de l&apos;inscription.</li>
                <li>Ouvrez le lien dans <strong>Safari ou Chrome</strong>, pas uniquement dans la fenêtre intégrée Facebook/Instagram si possible.</li>
              </ul>
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Renvoyer un email
              </button>
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
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email?.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Envoi en cours...' : 'Recevoir le lien par email'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center space-y-2">
            <Link href="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
              Retour à la connexion
            </Link>
            <p className="text-xs text-gray-500">
              Problème persistant ?{' '}
              <a href="mailto:contact@cvneat.fr" className="text-blue-600 underline">
                contact@cvneat.fr
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

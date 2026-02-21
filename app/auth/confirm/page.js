'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

const parseHashParams = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  // Supabase peut utiliser hash (#...) ou query (?...) selon le flux
  const hash = window.location.hash;
  const search = window.location.search;
  const hashParams = hash && hash.length > 1 ? new URLSearchParams(hash.substring(1)) : null;
  const searchParams = search && search.length > 1 ? new URLSearchParams(search.substring(1)) : null;
  return hashParams ?? searchParams;
};

const ALLOWED_TYPES = new Set(['signup', 'email_change', 'magiclink']);

export default function ConfirmEmailPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    const initialiseConfirmation = async () => {
      try {
        const hashParams = parseHashParams();

        if (hashParams && hashParams.has('type')) {
          const type = hashParams.get('type');

          if (type === 'recovery') {
            router.replace(`/auth/update-password${window.location.hash}`);
            return;
          }

          if (!ALLOWED_TYPES.has(type ?? '')) {
            setError("Ce lien n'est plus valide. Si vous venez de créer votre compte, essayez de vous connecter — l'inscription a peut-être déjà réussi.");
            setLoading(false);
            return;
          }
        }

        if (hashParams && hashParams.has('access_token') && hashParams.has('refresh_token')) {
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError('Impossible de valider le lien. Veuillez redemander un email de confirmation.');
            setLoading(false);
            return;
          }

          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        const {
          data: { session },
          error: getSessionError,
        } = await supabase.auth.getSession();

        if (getSessionError) {
          setError('Erreur lors de la validation de l’utilisateur. Veuillez redemander un email de confirmation.');
          setLoading(false);
          return;
        }

        if (!session) {
          // Pas de session : lien expiré OU compte déjà confirmé (auto-confirm). Message bienveillant.
          setError("Ce lien a peut-être déjà été utilisé ou a expiré. Si vous venez de créer votre compte, essayez de vous connecter — votre inscription a peut-être déjà réussi.");
          setLoading(false);
          return;
        }

        // On évite toute connexion automatique : on marque le succès puis on déconnecte.
        if (active) {
          setSuccess(true);
          setLoading(false);
        }

        await supabase.auth.signOut();

        setTimeout(() => {
          router.push('/login?confirm=success');
        }, 2500);
      } catch (err) {
        console.error('Erreur confirmation email:', err);
        if (active) {
          setError("Une erreur inattendue est survenue. Veuillez redemander un email de confirmation.");
          setLoading(false);
        }
      }
    };

    initialiseConfirmation();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">✅ Inscription réussie !</h1>
          <p className="text-sm text-gray-600 mt-2">
            Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.
          </p>
        </div>

        {loading && (
          <div className="text-center text-gray-600">
            <p>Finalisation de votre inscription…</p>
          </div>
        )}

        {!loading && success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm text-center">
            ✅ Votre compte est prêt ! Vous allez être redirigé vers la page de connexion…
          </div>
        )}

        {!loading && !success && error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm space-y-3">
            <p>{error}</p>
            <p className="font-medium">
              → <Link href="/login" className="text-indigo-600 underline">Aller à la connexion</Link>
            </p>
            <p className="text-xs text-amber-700">
              Si le problème persiste : <Link href="mailto:contact@cvneat.fr" className="text-indigo-600">contact@cvneat.fr</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}



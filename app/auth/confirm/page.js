'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { establishSessionFromAuthUrl } from '../../../lib/auth-session-from-url';

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
        const searchParams =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
            : null;
        const hashParams =
          typeof window !== 'undefined' && window.location.hash?.length > 1
            ? new URLSearchParams(window.location.hash.substring(1))
            : null;
        const typeHint = hashParams?.get('type') || searchParams?.get('type');

        if (typeHint === 'recovery') {
          const suffix =
            window.location.hash ||
            (searchParams?.get('code') ? `?code=${searchParams.get('code')}` : '');
          router.replace(`/auth/update-password${suffix}`);
          return;
        }

        const sessionResult = await establishSessionFromAuthUrl(supabase);

        if (sessionResult.type === 'recovery') {
          router.replace('/auth/update-password');
          return;
        }

        if (!sessionResult.ok) {
          setError(
            sessionResult.error ||
              "Ce lien a peut-être déjà été utilisé ou a expiré. Essayez de vous connecter ou redemandez un email."
          );
          setLoading(false);
          return;
        }

        if (sessionResult.type && !ALLOWED_TYPES.has(sessionResult.type)) {
          setError(
            "Ce lien n'est plus valide. Si vous venez de créer votre compte, essayez de vous connecter."
          );
          setLoading(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError(
            "Ce lien a peut-être déjà été utilisé ou a expiré. Si vous venez de créer votre compte, essayez de vous connecter."
          );
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



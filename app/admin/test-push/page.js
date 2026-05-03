'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaBell, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import Link from 'next/link';

export default function AdminTestPushPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (userData?.role !== 'admin') {
        router.push('/admin');
        return;
      }
      setIsAdmin(true);
    } finally {
      setAuthLoading(false);
    }
  };

  const sendTestPush = async (target) => {
    setLoading(true);
    setResult(null);
    try {
      const payload = {
        title: "Test CVN'EAT 🔔",
        body: 'Si tu vois cette notif, les pushes fonctionnent !',
        data: { type: 'admin_test', target },
      };

      if (target === 'me') {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) {
          setResult({ ok: false, error: 'Session introuvable' });
          return;
        }
        payload.userId = uid;
      } else {
        payload.role = target === 'restaurant' ? 'restaurant' : 'delivery';
      }

      const res = await fetch('/api/notifications/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      setResult(res.ok ? json : { ok: false, error: json?.error || res.statusText, ...json });
    } catch (e) {
      setResult({ ok: false, error: e?.message || 'Erreur réseau' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="h-8 w-8 animate-spin text-orange-500" />
      </main>
    );
  }

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-md mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <FaArrowLeft className="h-4 w-4" />
          Retour admin
        </Link>

        <h1 className="text-xl font-bold text-gray-900 mb-2">Test notifications push</h1>
        <p className="text-sm text-gray-600 mb-3">
          Les envois ciblent les comptes qui ont un <strong>token enregistré</strong> dans{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">device_tokens</code> (app native connectée, notifications
          acceptées).
        </p>
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>Astuce :</strong> l&apos;ancien bouton « livreurs seulement » expliquait souvent « je ne reçois rien
          sur mon iPhone » si ton compte est <strong>admin</strong> ou <strong>restaurant</strong>. Utilise « Mon
          compte » pour tester <em>ton</em> téléphone, ou le bouton partenaires pour les restaurateurs.
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => sendTestPush('me')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
          >
            {loading ? (
              <FaSpinner className="h-5 w-5 animate-spin" />
            ) : (
              <FaBell className="h-5 w-5" />
            )}
            Test sur mon compte (mon iPhone / mon app)
          </button>
          <button
            type="button"
            onClick={() => sendTestPush('delivery')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
          >
            {loading ? (
              <FaSpinner className="h-5 w-5 animate-spin" />
            ) : (
              <FaBell className="h-5 w-5" />
            )}
            Envoyer test à tous les livreurs
          </button>
          <button
            type="button"
            onClick={() => sendTestPush('restaurant')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium"
          >
            {loading ? (
              <FaSpinner className="h-5 w-5 animate-spin" />
            ) : (
              <FaBell className="h-5 w-5" />
            )}
            Envoyer test à tous les restaurants (partenaires)
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Diagnostic détaillé par utilisateur : page{' '}
          <Link href="/push-test" className="text-indigo-600 underline">
            /push-test
          </Link>{' '}
          (connecté, Bearer) — vérifie le nombre de tokens puis envoie un self-test.
        </p>

        {result && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              result.ok !== false && result.sent > 0
                ? 'bg-green-50 text-green-800 border border-green-200'
                : result.ok === false || result.sent === 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-gray-50 text-gray-800 border border-gray-200'
            }`}
          >
            {result.sent != null && (
              <p className="font-medium">
                Envoyé : {result.sent} / {result.total ?? '?'} tokens
              </p>
            )}
            {result.message && <p className="text-sm mt-1">{result.message}</p>}
            {result.error && <p className="text-sm mt-1 text-red-600">{result.error}</p>}
            {result.errors && result.errors.length > 0 && (
              <pre className="mt-2 text-xs overflow-auto max-h-32 bg-black/5 p-2 rounded">
                {JSON.stringify(result.errors, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function PushTestPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    setMe(null);

    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session?.access_token) {
      setLoading(false);
      setError("Tu dois être connecté dans l'app pour tester les notifications.");
      return;
    }

    try {
      const resMe = await fetch('/api/notifications/self-test', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const meJson = await resMe.json().catch(() => ({}));
      if (!resMe.ok) throw new Error(meJson?.error || 'Erreur lecture tokens');
      setMe(meJson);

      const res = await fetch('/api/notifications/self-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Erreur envoi push test');
      setStatus(json);
    } catch (e) {
      setError(e?.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="max-w-xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Test notifications push</h1>
      <p className="text-sm text-gray-600">
        Cette page vérifie que ton compte a bien un token enregistré et envoie un push de test sur TES appareils.
      </p>

      <button
        onClick={run}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Test en cours…' : 'Relancer le test'}
      </button>

      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}

      {me && (
        <div className="p-3 rounded-lg border bg-white text-sm space-y-1">
          <div>
            <strong>Compte:</strong> {me.email}
          </div>
          <div>
            <strong>Tokens trouvés:</strong> {me.count}
          </div>
          {Array.isArray(me.tokens) && me.tokens.length > 0 && (
            <div className="text-xs text-gray-600">
              {me.tokens.map((t, idx) => (
                <div key={idx}>
                  - {t.platform} (maj: {t.updated_at ? new Date(t.updated_at).toLocaleString('fr-FR') : 'n/a'})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {status && (
        <div className="p-3 rounded-lg border bg-white text-sm space-y-1">
          <div>
            <strong>Envoyés:</strong> {status.sent} / {status.total}
          </div>
          <div className="text-xs text-gray-600">
            iOS: {status.ios} — Android: {status.android}
          </div>
          {Array.isArray(status.errors) && status.errors.length > 0 && (
            <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded">
              {JSON.stringify(status.errors, null, 2)}
            </pre>
          )}
        </div>
      )}
    </main>
  );
}



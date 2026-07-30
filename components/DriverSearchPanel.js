'use client';

import { useEffect, useState } from 'react';
import { FaMotorcycle, FaStore, FaRedo, FaCheckCircle } from 'react-icons/fa';

/**
 * Écran de recherche livreur (3 min) avec animation + actions relancer / retrait.
 */
export default function DriverSearchPanel({
  orderId,
  accessToken,
  onDriverFound,
  onSwitchPickup,
  onCancel,
}) {
  const [status, setStatus] = useState('searching');
  const [remainingMs, setRemainingMs] = useState(3 * 60 * 1000);
  const [driverName, setDriverName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const headers = () => ({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });

  const startSearch = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/driver-search`, {
        method: 'POST',
        headers: headers(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Impossible de lancer la recherche');
      if (json.reserved) {
        setStatus('reserved');
        setDriverName(json.driver?.name || 'Livreur');
        onDriverFound?.(json);
        return;
      }
      setStatus('searching');
      setRemainingMs(json.remaining_ms ?? 3 * 60 * 1000);
    } catch (e) {
      setError(e.message);
      setStatus('error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!orderId || !accessToken) return;
    startSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, accessToken]);

  useEffect(() => {
    if (!orderId || !accessToken || status !== 'searching') return undefined;

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/driver-search`, {
          headers: headers(),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (json.remaining_ms != null) setRemainingMs(json.remaining_ms);
        if (json.reserved) {
          setStatus('reserved');
          setDriverName(json.driver?.name || 'Livreur');
          onDriverFound?.(json);
          return;
        }
        if (json.status === 'expired') {
          setStatus('expired');
          setRemainingMs(0);
        }
      } catch {
        /* ignore poll errors */
      }
    };

    const id = setInterval(poll, 2500);
    poll();
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, accessToken, status]);

  const secs = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(secs / 60)).padStart(1, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-orange-200 dark:border-orange-900/40 p-6 shadow-sm">
      {status === 'searching' && (
        <div className="text-center space-y-5">
          <div className="relative mx-auto w-28 h-28">
            <div className="absolute inset-0 rounded-full border-4 border-orange-100 dark:border-orange-900/40" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
            <div className="absolute inset-3 rounded-full bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
              <FaMotorcycle className="h-10 w-10 text-orange-500 animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Recherche d&apos;un livreur…
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              On contacte les livreurs disponibles autour de toi. Tu paieras seulement quand un
              livreur aura accepté.
            </p>
            <p className="mt-3 text-2xl font-mono font-semibold text-orange-600">
              {mm}:{ss}
            </p>
          </div>
          <p className="text-xs text-gray-500">Les livreurs reçoivent des alertes tant que personne n&apos;a accepté.</p>
        </div>
      )}

      {status === 'reserved' && (
        <div className="text-center space-y-3">
          <FaCheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Livreur trouvé !</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {driverName} a accepté ta course. Procède au paiement pour confirmer.
          </p>
        </div>
      )}

      {status === 'expired' && (
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Aucun livreur pour le moment
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Tu peux relancer une recherche, ou récupérer ta commande sur place (sans frais de
            livraison).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              disabled={busy}
              onClick={startSearch}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50"
            >
              <FaRedo /> Relancer la recherche (3 min)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onSwitchPickup?.();
                } finally {
                  setBusy(false);
                }
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-900 disabled:opacity-50"
            >
              <FaStore /> Retrait sur place
            </button>
          </div>
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-sm text-gray-500 underline">
              Annuler
            </button>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="text-center space-y-3">
          <p className="text-red-600 text-sm">{error || 'Erreur'}</p>
          <button
            type="button"
            onClick={startSearch}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}

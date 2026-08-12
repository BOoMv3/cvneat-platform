'use client';
import { goPartnerLogin } from '@/lib/partner-nav';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import {
  FaArrowLeft,
  FaDownload,
  FaEuroSign,
  FaFileInvoice,
  FaSpinner,
} from 'react-icons/fa';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      dateStyle: 'long',
    }).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso));
  } catch {
    return iso;
  }
}

function fmtEur(n) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0);
}

export default function PartnerFacturesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restaurant, setRestaurant] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          goPartnerLogin();
          return;
        }

        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        const role = (profile?.role || '').toLowerCase();
        if (!['restaurant', 'partner', 'admin'].includes(role)) {
          router.push('/');
          return;
        }

        const res = await fetch('/api/partner/transfers', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || 'Impossible de charger les factures');
          setLoading(false);
          return;
        }

        setRestaurant(data.restaurant || null);
        setTransfers(data.transfers || []);
      } catch (e) {
        setError(e.message || 'Erreur réseau');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const downloadInvoice = async (transfer) => {
    setDownloadingId(transfer.id);
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        goPartnerLogin();
        return;
      }

      const res = await fetch(
        `/api/partner/transfers/${transfer.id}/invoice?format=pdf`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Téléchargement impossible');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${transfer.invoice_number || `facture-${transfer.id.slice(0, 8)}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || 'Erreur téléchargement');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <FaSpinner className="animate-spin text-orange-600 text-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push('/partner')}
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200"
            title="Retour"
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FaFileInvoice className="text-orange-600" />
              Mes factures / paiements
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {restaurant?.nom || 'Restaurant'} — virements reçus de CVN&apos;EAT
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="mb-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 px-4 py-3 text-sm text-orange-900 dark:text-orange-100">
          À chaque paiement effectué par CVN&apos;EAT, la facture apparaît ici avec le montant viré.
          Vous pouvez la télécharger en PDF pour votre comptabilité.
        </div>

        {transfers.length === 0 ? (
          <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            Aucun paiement enregistré pour le moment.
          </div>
        ) : (
          <ul className="space-y-3">
            {transfers.map((t) => (
              <li
                key={t.id}
                className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-lg font-bold text-gray-900 dark:text-white">
                      <FaEuroSign className="text-emerald-600 h-4 w-4" />
                      {fmtEur(t.amount)}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      Payé
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Date du virement : <strong>{fmtDate(t.transfer_date)}</strong>
                  </p>
                  {(t.period_start || t.period_end) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Période : {fmtDate(t.period_start)} → {fmtDate(t.period_end)}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                    {t.invoice_number || `FAC-${(t.id || '').slice(0, 8).toUpperCase()}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadInvoice(t)}
                  disabled={downloadingId === t.id}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium disabled:opacity-60 min-h-[44px]"
                >
                  {downloadingId === t.id ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaDownload />
                  )}
                  Télécharger la facture
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

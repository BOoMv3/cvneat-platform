'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import DeliveryNavbar from '../../components/DeliveryNavbar';
import {
  FaArrowLeft,
  FaDownload,
  FaFileInvoice,
  FaSpinner,
  FaExclamationTriangle,
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

async function downloadInvoiceHtml(transferId, reference, token) {
  const res = await fetch(`/api/delivery/transfers/${transferId}/invoice`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Impossible de télécharger la facture');
  }
  const html = await res.text();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `facture-${reference || transferId}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DeliveryFacturesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transfers, setTransfers] = useState([]);
  const [billingOk, setBillingOk] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.push('/login');
          return;
        }
        setToken(session.access_token);

        const [tRes, pRes] = await Promise.all([
          fetch('/api/delivery/transfers', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch('/api/delivery/profile', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);

        const tJson = await tRes.json().catch(() => ({}));
        if (!tRes.ok) throw new Error(tJson.error || 'Impossible de charger les factures');
        setTransfers(tJson.transfers || []);

        if (pRes.ok) {
          const p = await pRes.json();
          setBillingOk(Boolean(p.siret && p.legal_name));
        }
      } catch (e) {
        setError(e.message || 'Erreur');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const onDownload = async (t) => {
    if (!token) return;
    setDownloadingId(t.id);
    try {
      await downloadInvoiceHtml(t.id, t.reference_number || t.id.slice(0, 8), token);
    } catch (e) {
      alert(e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DeliveryNavbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          type="button"
          onClick={() => router.push('/delivery/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 text-sm"
        >
          <FaArrowLeft /> Retour
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-orange-100 rounded-xl">
            <FaFileInvoice className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes factures</h1>
            <p className="text-sm text-gray-500">Paiements reçus + téléchargement</p>
          </div>
        </div>

        {!billingOk && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 flex gap-3">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">SIRET / raison sociale incomplets</p>
              <p className="mt-1">
                Complète tes infos pour que les prochaines factures soient correctes.{' '}
                <Link href="/delivery/profile" className="underline font-medium text-orange-700">
                  Aller au profil
                </Link>
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-orange-500">
            <FaSpinner className="animate-spin h-8 w-8" />
          </div>
        ) : transfers.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-500 text-sm">
            Aucune facture pour le moment. Tu recevras une notification push + email à chaque paiement.
          </div>
        ) : (
          <ul className="space-y-3">
            {transfers.map((t) => (
              <li
                key={t.id}
                className="bg-white rounded-xl border shadow-sm px-4 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-gray-900">{fmtEur(t.amount)}</p>
                  <p className="text-sm text-gray-500">{fmtDate(t.transfer_date)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.reference_number || `Paiement ${String(t.id).slice(0, 8)}`}
                    {t.orders_count != null ? ` · ${t.orders_count} course(s)` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDownload(t)}
                  disabled={downloadingId === t.id}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                  {downloadingId === t.id ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaDownload />
                  )}
                  Télécharger
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

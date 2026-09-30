'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaDownload, FaSearch } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import {
  comptableFetch,
  downloadRestaurantInvoicePdf,
  formatDateFR,
  formatEur,
} from '@/lib/comptable-api-client';
import { isAdminViewerRole } from '@/lib/admin-viewer';

export default function AdminRestaurantInvoicesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login?redirect=/admin/factures-restaurants');
        return;
      }
      const { data } = await supabase.from('users').select('role').eq('id', session.user.id).maybeSingle();
      const role = (data?.role || '').toString().trim().toLowerCase();
      if (!isAdminViewerRole(role) && role !== 'comptable') {
        router.push('/');
        return;
      }
      setReady(true);
    })();
  }, [router]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const data = await comptableFetch(`/api/comptable/restaurant-transfers?${params}`);
      setTransfers(data.transfers || []);
      setTotalAmount(data.totalAmount || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  const handleDownload = async (t) => {
    try {
      setDownloading(t.id);
      await downloadRestaurantInvoicePdf(t.id, t.invoice_number);
    } catch (e) {
      alert(e.message);
    } finally {
      setDownloading(null);
    }
  };

  const exportCsv = () => {
    const header = [
      'N° facture',
      'Restaurant',
      'Date virement',
      'Période début',
      'Période fin',
      'Montant',
      'Référence',
      'ID virement',
    ];
    const lines = transfers.map((t) =>
      [
        t.invoice_number || '',
        t.restaurant_name || '',
        t.transfer_date || '',
        t.period_start || '',
        t.period_end || '',
        t.amount ?? '',
        t.reference_number || '',
        t.id,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(';')
    );
    const blob = new Blob([[header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factures-restaurants-payees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-gray-50 to-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/admin/payments"
              className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
              <FaArrowLeft className="h-3 w-3" /> Paiements
            </Link>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
              Factures restaurants payées
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Tous les virements effectués aux restaurants + PDF de relevé.
              {transfers.length > 0 ? (
                <>
                  {' '}
                  <strong>{transfers.length}</strong> facture(s) — total{' '}
                  <strong>{formatEur(totalAmount)}</strong>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/payments/transfers"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-orange-200"
            >
              Faire un virement
            </Link>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!transfers.length}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Exporter CSV
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold text-gray-500">Recherche</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Restaurant, n° facture, référence…"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Du</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Au</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
          >
            Filtrer
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-orange-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-orange-50/80 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">N° facture</th>
                <th className="px-4 py-3 text-left font-semibold">Restaurant</th>
                <th className="px-4 py-3 text-left font-semibold">Date virement</th>
                <th className="px-4 py-3 text-left font-semibold">Période</th>
                <th className="px-4 py-3 text-right font-semibold">Montant payé</th>
                <th className="px-4 py-3 text-left font-semibold">Référence</th>
                <th className="px-4 py-3 text-right font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Chargement…
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Aucune facture / virement trouvé.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-orange-50/40">
                    <td className="px-4 py-3 font-mono text-xs">{t.invoice_number || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.restaurant_name || '—'}</td>
                    <td className="px-4 py-3">{formatDateFR(t.transfer_date)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.period_start && t.period_end
                        ? `${formatDateFR(t.period_start)} → ${formatDateFR(t.period_end)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatEur(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.reference_number || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownload(t)}
                        disabled={downloading === t.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                      >
                        <FaDownload />
                        {downloading === t.id ? '…' : 'PDF'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

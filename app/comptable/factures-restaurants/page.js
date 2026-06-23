'use client';

import { useEffect, useState } from 'react';
import {
  comptableFetch,
  downloadRestaurantInvoicePdf,
  formatDateFR,
  formatEur,
} from '../../../lib/comptable-api-client';
import { FaDownload, FaSearch } from 'react-icons/fa';

export default function ComptableRestaurantInvoicesPage() {
  const [transfers, setTransfers] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState(null);

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
    load();
  }, []);

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
    a.download = `factures-restaurants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Factures restaurants</h1>
          <p className="text-slate-600 mt-1">
            {transfers.length} virement(s) — total {formatEur(totalAmount)}
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!transfers.length}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
        >
          Exporter CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-500 block mb-1">Recherche</label>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Restaurant, n° facture, référence…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Du</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Au</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button type="button" onClick={load} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium">
          Filtrer
        </button>
      </div>

      {error && <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">N° facture</th>
              <th className="text-left px-4 py-3 font-medium">Restaurant</th>
              <th className="text-left px-4 py-3 font-medium">Date virement</th>
              <th className="text-left px-4 py-3 font-medium">Période</th>
              <th className="text-right px-4 py-3 font-medium">Montant</th>
              <th className="text-left px-4 py-3 font-medium">Référence</th>
              <th className="text-right px-4 py-3 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Chargement…</td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Aucune facture.</td></tr>
            ) : (
              transfers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{t.invoice_number || '—'}</td>
                  <td className="px-4 py-3">{t.restaurant_name || '—'}</td>
                  <td className="px-4 py-3">{formatDateFR(t.transfer_date)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.period_start && t.period_end
                      ? `${formatDateFR(t.period_start)} → ${formatDateFR(t.period_end)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatEur(t.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{t.reference_number || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDownload(t)}
                      disabled={downloading === t.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium disabled:opacity-50"
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
  );
}

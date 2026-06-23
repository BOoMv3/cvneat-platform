'use client';

import { useEffect, useState } from 'react';
import { comptableFetch, formatDateFR, formatEur } from '../../../lib/comptable-api-client';

export default function ComptableOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '1000' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const data = await comptableFetch(`/api/comptable/orders?${params}`);
      setOrders(data.orders || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exportCsv = () => {
    const header = [
      'Date',
      'Commande',
      'Restaurant',
      'SIRET',
      'Total TTC',
      'Commission',
      'Net restaurant',
      'Net livreur',
      'Net CVN\'EAT',
      'Promo plateforme',
      'Paiement',
      'Payé resto',
      'Payé livreur',
      'Stripe PI',
      'Remboursement',
    ];
    const lines = orders.map((o) =>
      [
        o.created_at,
        o.shortId,
        o.restaurant_name,
        o.restaurant_siret || '',
        o.total_ttc,
        o.commission_amount,
        o.restaurant_payout ?? '',
        o.livreur_net,
        o.cvneat_net,
        o.platform_discount_amount,
        o.payment_status,
        o.restaurant_paid_at || '',
        o.livreur_paid_at || '',
        o.stripe_payment_intent_id || '',
        o.stripe_refund_id ? o.refund_amount : '',
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(';')
    );
    const blob = new Blob([[header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commandes-livrees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = orders.reduce(
    (acc, o) => {
      acc.ttc += o.total_ttc || 0;
      acc.commission += o.commission_amount || 0;
      acc.cvneat += o.cvneat_net || 0;
      return acc;
    },
    { ttc: 0, commission: 0, cvneat: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commandes livrées</h1>
          <p className="text-slate-600 mt-1">
            {orders.length} ligne(s) — TTC {formatEur(totals.ttc)} — gain CVN&apos;EAT {formatEur(totals.cvneat)}
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!orders.length}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
        >
          Exporter CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
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
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-left px-3 py-2 font-medium">Cmd</th>
              <th className="text-left px-3 py-2 font-medium">Restaurant</th>
              <th className="text-right px-3 py-2 font-medium">TTC</th>
              <th className="text-right px-3 py-2 font-medium">Commission</th>
              <th className="text-right px-3 py-2 font-medium">Net CVN&apos;EAT</th>
              <th className="text-right px-3 py-2 font-medium">Net livreur</th>
              <th className="text-left px-3 py-2 font-medium">Paiement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Chargement…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Aucune commande.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateFR(o.created_at)}</td>
                  <td className="px-3 py-2 font-mono">#{o.shortId}</td>
                  <td className="px-3 py-2">{o.restaurant_name}</td>
                  <td className="px-3 py-2 text-right">{formatEur(o.total_ttc)}</td>
                  <td className="px-3 py-2 text-right">{formatEur(o.commission_amount)}</td>
                  <td className="px-3 py-2 text-right font-medium text-emerald-700">{formatEur(o.cvneat_net)}</td>
                  <td className="px-3 py-2 text-right">{formatEur(o.livreur_net)}</td>
                  <td className="px-3 py-2">
                    <span className={o.payment_status === 'refunded' ? 'text-red-600' : 'text-slate-600'}>
                      {o.payment_status}
                    </span>
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

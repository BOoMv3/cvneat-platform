'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { comptableFetch, formatDateFR, formatEur } from '../../lib/comptable-api-client';

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
      {sub ? <p className="text-xs text-slate-500 mt-1">{sub}</p> : null}
    </div>
  );
}

export default function ComptableDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    comptableFetch('/api/comptable/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-500">Chargement du tableau de bord…</div>;
  }
  if (error) {
    return <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">{error}</div>;
  }

  const s = data?.summary || {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord comptabilité</h1>
        <p className="text-slate-600 mt-1">
          Vue d&apos;ensemble des virements, factures et revenus plateforme (lecture seule).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Virements restaurants"
          value={formatEur(s.restaurantTransferredTotal)}
          sub={`${s.restaurantTransfersCount || 0} factures enregistrées`}
        />
        <StatCard
          label="Virements livreurs"
          value={formatEur(s.deliveryTransferredTotal)}
          sub={`${s.deliveryTransfersCount || 0} paiements`}
        />
        <StatCard
          label="Gain net CVN'EAT"
          value={formatEur(s.cvneatNetRevenue)}
          sub={`${s.deliveredOrdersCount || 0} commandes livrées payées`}
        />
        <StatCard
          label="CA commandes (TTC)"
          value={formatEur(s.ordersRevenueTotal)}
          sub="Articles + livraison"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Derniers virements restaurants</h2>
            <Link href="/comptable/factures-restaurants" className="text-sm text-emerald-700 hover:underline">
              Tout voir
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.recentRestaurantTransfers || []).map((t) => (
              <div key={t.id} className="px-5 py-3 flex justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{t.invoice_number || `#${t.id.slice(0, 8)}`}</p>
                  <p className="text-slate-500">{formatDateFR(t.transfer_date)}</p>
                </div>
                <p className="font-semibold text-slate-900">{formatEur(t.amount)}</p>
              </div>
            ))}
            {!data?.recentRestaurantTransfers?.length && (
              <p className="px-5 py-6 text-slate-500 text-sm">Aucun virement.</p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-900">Derniers virements livreurs</h2>
            <Link href="/comptable/factures-livreurs" className="text-sm text-emerald-700 hover:underline">
              Tout voir
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.recentDeliveryTransfers || []).map((t) => (
              <div key={t.id} className="px-5 py-3 flex justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{t.delivery_name || 'Livreur'}</p>
                  <p className="text-slate-500">{formatDateFR(t.transfer_date)}</p>
                </div>
                <p className="font-semibold text-slate-900">{formatEur(t.amount)}</p>
              </div>
            ))}
            {!data?.recentDeliveryTransfers?.length && (
              <p className="px-5 py-6 text-slate-500 text-sm">Aucun virement.</p>
            )}
          </div>
        </section>
      </div>

      <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm text-emerald-900">
        <p className="font-semibold">Détail gain CVN&apos;EAT (commandes livrées)</p>
        <ul className="mt-2 grid sm:grid-cols-2 gap-1 text-emerald-800">
          <li>Commission restaurants : {formatEur(s.cvneatCommissionTotal)}</li>
          <li>Frais plateforme (0,49 € / cmd) : {formatEur(s.cvneatPlatformFeesTotal)}</li>
          <li>Commission livraison : {formatEur(s.cvneatDeliveryCommissionTotal)}</li>
          <li>− Promos plateforme : {formatEur(s.cvneatPlatformPromoCost)}</li>
          <li>− Subventions fidélité : {formatEur(s.cvneatLoyaltySubsidyTotal)}</li>
          <li className="font-semibold">= Net : {formatEur(s.cvneatNetRevenue)}</li>
        </ul>
      </section>
    </div>
  );
}

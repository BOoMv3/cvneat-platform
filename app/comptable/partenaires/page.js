'use client';

import { useEffect, useState } from 'react';
import { comptableFetch } from '../../../lib/comptable-api-client';

export default function ComptablePartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    comptableFetch('/api/comptable/partners')
      .then((d) => setPartners(d.partners || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    const header = ['Nom commercial', 'Raison sociale', 'SIRET', 'TVA', 'Email', 'Téléphone', 'Adresse', 'CP', 'Ville', 'Commission %', 'Statut'];
    const lines = partners.map((p) =>
      [
        p.nom,
        p.legal_name || '',
        p.siret || '',
        p.vat_number || '',
        p.email || '',
        p.telephone || '',
        p.adresse || '',
        p.code_postal || '',
        p.ville || '',
        p.commission_rate ?? '',
        p.status || '',
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(';')
    );
    const blob = new Blob([[header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partenaires-cvneat-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Partenaires — informations légales</h1>
          <p className="text-slate-600 mt-1">{partners.length} restaurant(s) enregistré(s)</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!partners.length}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
        >
          Exporter CSV
        </button>
      </div>

      {error && <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Nom</th>
              <th className="text-left px-4 py-3 font-medium">Raison sociale</th>
              <th className="text-left px-4 py-3 font-medium">SIRET</th>
              <th className="text-left px-4 py-3 font-medium">N° TVA</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Adresse</th>
              <th className="text-center px-4 py-3 font-medium">Commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Chargement…</td></tr>
            ) : partners.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Aucun partenaire.</td></tr>
            ) : (
              partners.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{p.nom}</td>
                  <td className="px-4 py-3">{p.legal_name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.siret || <span className="text-amber-600">manquant</span>}</td>
                  <td className="px-4 py-3">{p.vat_number || '—'}</td>
                  <td className="px-4 py-3">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[p.adresse, p.code_postal, p.ville].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">{p.commission_rate != null ? `${p.commission_rate}%` : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

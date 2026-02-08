'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { apiRequestJson } from '@/lib/api-client-mobile';

function formatDiscount(p) {
  if (!p) return '';
  if (p.discount_type === 'percentage') return `-${p.discount_value}%`;
  if (p.discount_type === 'fixed') return `-${Number(p.discount_value).toFixed(2)}€`;
  if (p.discount_type === 'free_delivery') return 'Livraison offerte';
  return `${p.discount_type} ${p.discount_value}`;
}

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('fr-FR');
  } catch {
    return String(v);
  }
}

export default function AdminPromoCodesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [selectedCode, setSelectedCode] = useState('PSGOM10');
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState('');

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({
    code: 'PSGOM10',
    discount_type: 'percentage',
    discount_value: 10,
    description: 'PSG vs OM -10% ce soir',
    valid_until: '',
    is_active: true,
  });

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Session expirée');
    return token;
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await apiRequestJson(
        `/api/admin/promo-codes/list?limit=80${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setError(e?.message || 'Erreur chargement codes promo');
    } finally {
      setLoading(false);
    }
  }, [getToken, q]);

  const refreshSelected = useCallback(
    async (code) => {
      const c = (code || '').toString().trim().toUpperCase();
      if (!c) return;
      setSelectedLoading(true);
      setSelectedError('');
      try {
        const token = await getToken();
        const s = await apiRequestJson(`/api/admin/promo-codes/summary?code=${encodeURIComponent(c)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedSummary(s || null);
      } catch (e) {
        setSelectedError(e?.message || 'Erreur chargement statistiques');
        setSelectedSummary(null);
      } finally {
        setSelectedLoading(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshSelected(selectedCode);
  }, [selectedCode, refreshSelected]);

  const selectedPromo = selectedSummary?.promo || null;
  const selectedUsageCount = selectedSummary?.usageCount ?? selectedPromo?.current_uses ?? 0;

  const sorted = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];
    arr.sort((a, b) => {
      const au = Number(a?.current_uses || 0);
      const bu = Number(b?.current_uses || 0);
      if (bu !== au) return bu - au;
      return String(b?.created_at || '').localeCompare(String(a?.created_at || ''));
    });
    return arr;
  }, [items]);

  const handleCreateOrUpdate = async () => {
    setCreating(true);
    setCreateError('');
    try {
      const token = await getToken();
      const promo = await apiRequestJson('/api/admin/promo-codes/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        data: {
          ...form,
          code: String(form.code || '').trim().toUpperCase(),
          discount_value: Number(form.discount_value),
          valid_until: form.valid_until || null,
        },
      });
      const created = promo?.promo;
      if (created?.code) {
        setSelectedCode(created.code);
        setForm((f) => ({ ...f, code: created.code }));
      }
      await refreshList();
      await refreshSelected(created?.code || form.code);
    } catch (e) {
      setCreateError(e?.message || 'Erreur création code promo');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <div>
              <h1 className="text-2xl font-extrabold">Codes promo</h1>
              <div className="text-sm opacity-80">Suivi des utilisations + création rapide.</div>
            </div>
            <a href="/admin" className="text-sm underline opacity-90">
              Retour dashboard
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: list */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-200 dark:border-gray-700 lg:col-span-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher un code (ex: PSGOM10)…"
                  className="w-full md:flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                />
                <button
                  onClick={refreshList}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold"
                  disabled={loading}
                >
                  Rechercher
                </button>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-200 p-3 rounded-lg border border-red-200 dark:border-red-800 mb-3">
                  {error}
                </div>
              )}

              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left opacity-80">
                    <tr>
                      <th className="py-2">Code</th>
                      <th className="py-2">Réduction</th>
                      <th className="py-2">Utilisations</th>
                      <th className="py-2">Actif</th>
                      <th className="py-2">Expire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td className="py-3" colSpan={5}>
                          Chargement…
                        </td>
                      </tr>
                    ) : sorted.length === 0 ? (
                      <tr>
                        <td className="py-3" colSpan={5}>
                          Aucun code.
                        </td>
                      </tr>
                    ) : (
                      sorted.map((p) => (
                        <tr
                          key={p.id}
                          className={`border-t border-gray-200 dark:border-gray-700 cursor-pointer ${
                            (p.code || '').toUpperCase() === selectedCode ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          onClick={() => setSelectedCode((p.code || '').toUpperCase())}
                        >
                          <td className="py-2 font-semibold">{p.code}</td>
                          <td className="py-2">{formatDiscount(p)}</td>
                          <td className="py-2">{Number(p.current_uses || 0)}</td>
                          <td className="py-2">{p.is_active ? '✅' : '—'}</td>
                          <td className="py-2">{p.valid_until ? fmtDate(p.valid_until) : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: selected + create */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-sm opacity-80">Détails</div>
                <div className="text-xl font-extrabold mt-1">{selectedCode}</div>

                {selectedLoading ? (
                  <div className="mt-3 text-sm opacity-80">Chargement…</div>
                ) : selectedError ? (
                  <div className="mt-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-200 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    {selectedError}
                  </div>
                ) : !selectedPromo ? (
                  <div className="mt-3 text-sm opacity-80">Sélectionne un code.</div>
                ) : (
                  <div className="mt-3 space-y-1 text-sm">
                    <div>
                      <strong>Réduction:</strong> {formatDiscount(selectedPromo)}
                    </div>
                    <div>
                      <strong>Utilisations (réel):</strong> {selectedUsageCount}
                    </div>
                    <div>
                      <strong>Actif:</strong> {selectedPromo.is_active ? 'Oui' : 'Non'}
                    </div>
                    <div>
                      <strong>Valable jusqu’à:</strong> {fmtDate(selectedPromo.valid_until)}
                    </div>
                    {selectedPromo.description ? (
                      <div className="pt-2 opacity-90">
                        <strong>Description:</strong> {selectedPromo.description}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-sm opacity-80 mb-2">Créer / Mettre à jour</div>
                {createError && (
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-200 p-3 rounded-lg border border-red-200 dark:border-red-800 mb-3">
                    {createError}
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="CODE"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={form.discount_type}
                      onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">€</option>
                      <option value="free_delivery">Livraison offerte</option>
                    </select>
                    <input
                      value={form.discount_value}
                      onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                      placeholder="Valeur"
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                      disabled={form.discount_type === 'free_delivery'}
                    />
                  </div>
                  <input
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Description"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  />
                  <input
                    value={form.valid_until}
                    onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                    placeholder="valid_until (ISO) ex: 2026-02-08T23:59:59+01:00"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    />
                    Actif
                  </label>
                  <button
                    onClick={handleCreateOrUpdate}
                    className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
                    disabled={creating}
                  >
                    {creating ? 'En cours…' : 'Enregistrer'}
                  </button>
                  <div className="text-xs opacity-70">
                    Astuce: pour ce soir tu peux laisser “valid_until” vide si tu veux qu’il reste actif.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}


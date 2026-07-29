'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { FaEye, FaSpinner, FaSignOutAlt, FaStore, FaMotorcycle, FaClipboardList } from 'react-icons/fa';

export default function AssocieDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const { data: u } = await supabase.from('users').select('role').eq('id', session.user.id).maybeSingle();
      const metaRole = (session.user.user_metadata?.role || session.user.app_metadata?.role || '')
        .toString()
        .trim()
        .toLowerCase();
      const role = (u?.role || metaRole || '').toLowerCase();
      if (role !== 'associe' && role !== 'admin') {
        router.push('/');
        return;
      }
      try {
        const res = await fetch('/api/associe/overview', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Erreur chargement');
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <FaSpinner className="animate-spin h-8 w-8 text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FaEye className="text-slate-500" />
              Espace associé
            </h1>
            <p className="text-sm text-slate-500">
              Lecture seule — aperçu activité CVN&apos;EAT
              {data?.profile?.prenom ? ` · ${data.profile.prenom}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 px-3 py-2"
          >
            <FaSignOutAlt /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Commandes aujourd&apos;hui</p>
            <p className="text-2xl font-bold">{data?.stats?.orders_today ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Livrées aujourd&apos;hui</p>
            <p className="text-2xl font-bold text-green-700">{data?.stats?.delivered_today ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">En cours</p>
            <p className="text-2xl font-bold text-orange-600">{data?.stats?.live_count ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Restos ouverts</p>
            <p className="text-2xl font-bold">
              {data?.stats?.restaurants_open ?? 0}
              <span className="text-sm font-normal text-slate-400">
                /{data?.stats?.restaurants_total ?? 0}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold flex items-center gap-2">
            <FaClipboardList /> Commandes en cours
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">Heure</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Restaurant</th>
                  <th className="px-3 py-2">Livreur</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.live_orders || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      Aucune commande en cours
                    </td>
                  </tr>
                )}
                {(data?.live_orders || []).map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(o.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2">{o.statut}</td>
                    <td className="px-3 py-2">{o.restaurant}</td>
                    <td className="px-3 py-2">{o.livreur}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {parseFloat(o.total || 0).toFixed(2)}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <FaStore /> Restaurants ouverts
            </h2>
            <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
              {(data?.restaurants_open || []).map((r) => (
                <li key={r.id} className="text-slate-700">
                  {r.nom}
                </li>
              ))}
              {(data?.restaurants_open || []).length === 0 && (
                <li className="text-slate-400">Aucun</li>
              )}
            </ul>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <FaMotorcycle /> Paiements du jour
            </h2>
            <p className="text-xs text-slate-500 mb-2">Restaurants</p>
            <ul className="text-sm space-y-1 mb-3">
              {(data?.restaurant_transfers_today || []).map((t) => (
                <li key={t.id} className="flex justify-between">
                  <span>{t.restaurant_name || '—'}</span>
                  <span className="font-medium">{parseFloat(t.amount || 0).toFixed(2)}€</span>
                </li>
              ))}
              {(data?.restaurant_transfers_today || []).length === 0 && (
                <li className="text-slate-400">Aucun</li>
              )}
            </ul>
            <p className="text-xs text-slate-500 mb-2">Livreurs</p>
            <ul className="text-sm space-y-1">
              {(data?.delivery_transfers_today || []).map((t) => (
                <li key={t.id} className="flex justify-between">
                  <span>{t.delivery_name || '—'}</span>
                  <span className="font-medium">{parseFloat(t.amount || 0).toFixed(2)}€</span>
                </li>
              ))}
              {(data?.delivery_transfers_today || []).length === 0 && (
                <li className="text-slate-400">Aucun</li>
              )}
            </ul>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Compte semi-admin : consultation uniquement, aucune modification possible.
        </p>
      </main>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAdminViewerRole } from '@/lib/admin-viewer';
import {
  FaArrowLeft,
  FaMotorcycle,
  FaSearch,
  FaSync,
  FaPhone,
  FaMapMarkerAlt,
  FaStore,
  FaUser,
  FaCircle,
} from 'react-icons/fa';

const STATUS_LABEL = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  en_preparation: 'En préparation',
  prete: 'Prête',
  en_livraison: 'En livraison',
  assignee: 'Assignée',
  recuperee: 'Récupérée',
};

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function customerName(o) {
  const n = [o.customer_first_name, o.customer_last_name].filter(Boolean).join(' ').trim();
  return n || 'Client';
}

function OrderCard({ order, highlight }) {
  const resto = order.restaurants || {};
  const livreur = order.livreur || {};
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        highlight ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-orange-600">
            {STATUS_LABEL[order.statut] || order.statut}
            {order.driver_search_status === 'searching' ? ' · Recherche livreur' : ''}
          </p>
          <p className="text-sm font-semibold text-gray-900">
            #{order.numero_commande || order.id?.slice(0, 8)}
          </p>
        </div>
        <p className="text-xs text-gray-500 whitespace-nowrap">{fmtTime(order.created_at)}</p>
      </div>

      <div className="space-y-1.5 text-sm text-gray-700">
        <p className="flex items-center gap-2">
          <FaStore className="text-gray-400 shrink-0" />
          <span className="font-medium">{resto.nom || 'Restaurant'}</span>
        </p>
        <p className="flex items-center gap-2">
          <FaUser className="text-gray-400 shrink-0" />
          <span>{customerName(order)}</span>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="text-orange-600 inline-flex items-center gap-1">
              <FaPhone className="h-3 w-3" /> {order.customer_phone}
            </a>
          )}
        </p>
        {(order.adresse_livraison || order.ville_livraison) && (
          <p className="flex items-start gap-2">
            <FaMapMarkerAlt className="text-gray-400 shrink-0 mt-0.5" />
            <span>
              {order.adresse_livraison}
              {order.ville_livraison ? `, ${order.ville_livraison}` : ''}
            </span>
          </p>
        )}
        {order.livreur_id && (
          <p className="flex items-center gap-2 text-indigo-700">
            <FaMotorcycle className="shrink-0" />
            <span>
              {[livreur.prenom, livreur.nom].filter(Boolean).join(' ') || 'Livreur'}
              {livreur.telephone ? ` · ${livreur.telephone}` : ''}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminLiveDeliveryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login?redirect=/admin/live-delivery');
        return;
      }

      const { data: me } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!isAdminViewerRole(me?.role)) {
        router.push('/');
        return;
      }

      const res = await fetch('/api/admin/live-delivery', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Chargement impossible');
      setData(json);
    } catch (e) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 12000);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    );
  }

  const counts = data?.counts || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
          <div>
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
            >
              <FaArrowLeft className="mr-2" /> Dashboard admin
            </button>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">
              Ops livraison
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Live livreurs</h1>
            <p className="text-sm text-gray-600 mt-1">
              Vue temps réel des courses — comme un dashboard livreur, côté admin
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            <FaSync className={refreshing ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
          {[
            { label: 'Actives', value: counts.total_active, color: 'bg-white' },
            { label: 'Recherche', value: counts.searching, color: 'bg-orange-50' },
            { label: 'Préparation', value: counts.preparing, color: 'bg-amber-50' },
            { label: 'Assignées', value: counts.assigned, color: 'bg-indigo-50' },
            { label: 'En course', value: counts.in_delivery, color: 'bg-emerald-50' },
            { label: 'Sur une course', value: counts.drivers_on_order, color: 'bg-green-50' },
          ].map((c) => (
            <div key={c.label} className={`rounded-2xl border border-gray-200 ${c.color} p-3`}>
              <p className="text-[11px] font-semibold uppercase text-gray-500">{c.label}</p>
              <p className="text-2xl font-black text-gray-900">{c.value ?? 0}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3">
              <FaSearch className="text-orange-500" /> Recherche / sans livreur
            </h2>
            <div className="space-y-3">
              {(data?.searching || []).length === 0 ? (
                <p className="text-sm text-gray-500 bg-white border border-dashed border-gray-200 rounded-2xl p-4">
                  Aucune course en recherche pour le moment.
                </p>
              ) : (
                (data?.searching || []).map((o) => (
                  <OrderCard key={o.id} order={o} highlight />
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-3">
              <FaMotorcycle className="text-indigo-500" /> En livraison / assignées
            </h2>
            <div className="space-y-3">
              {(data?.assigned || []).length === 0 ? (
                <p className="text-sm text-gray-500 bg-white border border-dashed border-gray-200 rounded-2xl p-4">
                  Aucune course assignée en cours.
                </p>
              ) : (
                (data?.assigned || []).map((o) => <OrderCard key={o.id} order={o} />)
              )}
            </div>
          </section>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Livreurs</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(data?.drivers || []).map((d) => (
              <div
                key={d.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 flex items-center gap-3"
              >
                <FaCircle
                  className={`h-3 w-3 ${d.on_active_order ? 'text-green-500' : 'text-gray-300'}`}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {[d.prenom, d.nom].filter(Boolean).join(' ') || d.email || 'Livreur'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {d.on_active_order ? 'Sur une course' : 'Libre / hors course'}
                    {d.telephone ? ` · ${d.telephone}` : ''}
                  </p>
                </div>
              </div>
            ))}
            {(data?.drivers || []).length === 0 && (
              <p className="text-sm text-gray-500">Aucun livreur trouvé.</p>
            )}
          </div>
          {data?.updated_at && (
            <p className="text-xs text-gray-400 mt-4">Maj {fmtTime(data.updated_at)}</p>
          )}
        </section>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  FaArrowLeft,
  FaCircle,
  FaSync,
  FaUser,
  FaUserSecret,
  FaTruck,
  FaStore,
  FaUserShield,
} from 'react-icons/fa';

const CHANNEL = 'cvneat-site-presence';

const ROLE_LABELS = {
  user: 'Client',
  guest: 'Visiteur',
  delivery: 'Livreur',
  partner: 'Partenaire',
  admin: 'Admin',
  comptable: 'Comptable',
};

function flattenPresence(state) {
  const rows = [];
  Object.entries(state || {}).forEach(([key, metas]) => {
    const list = Array.isArray(metas) ? metas : [metas];
    list.forEach((meta) => {
      if (!meta || typeof meta !== 'object') return;
      rows.push({
        key,
        user_id: meta.user_id || null,
        email: meta.email || null,
        name: meta.name || '',
        role: (meta.role || (meta.guest ? 'guest' : 'user')).toString().toLowerCase(),
        path: meta.path || '/',
        online_at: meta.online_at || null,
        guest: !!meta.guest || !meta.user_id,
      });
    });
  });

  // Une entrée par clé présence (dernière meta)
  const byKey = new Map();
  rows.forEach((r) => {
    const prev = byKey.get(r.key);
    if (!prev || (r.online_at || '') > (prev.online_at || '')) {
      byKey.set(r.key, r);
    }
  });

  return Array.from(byKey.values()).sort((a, b) =>
    (b.online_at || '').localeCompare(a.online_at || '')
  );
}

function roleBadgeClass(role) {
  switch (role) {
    case 'delivery':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200';
    case 'partner':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    case 'admin':
    case 'comptable':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    case 'guest':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    default:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
  }
}

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      timeStyle: 'medium',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminPresencePage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [online, setOnline] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let channel = null;

    const boot = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: me } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!me || me.role !== 'admin') {
        router.push('/');
        return;
      }
      if (cancelled) return;
      setAuthReady(true);

      // Observateur uniquement : le PresenceTracker (layout) signale déjà l'admin.
      channel = supabase.channel(CHANNEL);

      const sync = () => {
        const state = channel.presenceState();
        setOnline(flattenPresence(state));
        setLastSync(new Date().toISOString());
      };

      channel
        .on('presence', { event: 'sync' }, sync)
        .on('presence', { event: 'join' }, sync)
        .on('presence', { event: 'leave' }, sync)
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnected(true);
            setError('');
            sync();
          }
          if (status === 'CHANNEL_ERROR') {
            setConnected(false);
            setError('Connexion Realtime impossible. Vérifie Realtime sur Supabase.');
          }
        });
    };

    boot();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  const counts = useMemo(() => {
    const c = { total: online.length, clients: 0, guests: 0, delivery: 0, partner: 0, admin: 0 };
    online.forEach((u) => {
      if (u.role === 'delivery') c.delivery += 1;
      else if (u.role === 'partner') c.partner += 1;
      else if (u.role === 'admin' || u.role === 'comptable') c.admin += 1;
      else if (u.guest || u.role === 'guest') c.guests += 1;
      else c.clients += 1;
    });
    return c;
  }, [online]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-300">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200"
              title="Retour admin"
            >
              <FaArrowLeft />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                En ligne maintenant
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <FaCircle
                  className={`h-2.5 w-2.5 ${connected ? 'text-emerald-500' : 'text-red-400'}`}
                />
                {connected ? 'Temps réel actif' : 'Déconnecté'}
                {lastSync ? ` · sync ${fmtTime(lastSync)}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              // force re-read
              setLastSync(new Date().toISOString());
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700"
          >
            <FaSync className="h-3.5 w-3.5" />
            Actualiser
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total', value: counts.total, icon: FaCircle, color: 'text-orange-600' },
            { label: 'Clients', value: counts.clients, icon: FaUser, color: 'text-emerald-600' },
            { label: 'Visiteurs', value: counts.guests, icon: FaUserSecret, color: 'text-gray-600' },
            { label: 'Livreurs', value: counts.delivery, icon: FaTruck, color: 'text-indigo-600' },
            { label: 'Restos', value: counts.partner, icon: FaStore, color: 'text-amber-600' },
            { label: 'Admin', value: counts.admin, icon: FaUserShield, color: 'text-red-600' },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3"
            >
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                {card.label}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Personnes actives</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Mise à jour automatique dès qu’un onglet ouvre / quitte le site.
            </p>
          </div>

          {online.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-500 dark:text-gray-400 text-sm">
              Personne d’autre en ligne pour le moment.
              <br />
              Ouvre cvneat.fr dans un autre onglet pour tester.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {online.map((u) => (
                <li key={u.key} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FaCircle className="h-2 w-2 text-emerald-500 flex-shrink-0" />
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {u.name || (u.guest ? 'Visiteur anonyme' : u.email || 'Utilisateur')}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleBadgeClass(u.role)}`}
                      >
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {u.email || (u.guest ? `id ${u.key.replace(/^guest:/, '').slice(0, 8)}…` : '—')}
                    </p>
                  </div>
                  <div className="sm:text-right text-sm">
                    <p className="font-mono text-gray-800 dark:text-gray-200 truncate max-w-[280px]">
                      {u.path}
                    </p>
                    <p className="text-xs text-gray-500">{fmtTime(u.online_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

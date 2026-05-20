'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaArrowLeft, FaSearch, FaCopy, FaPhone, FaEnvelope } from 'react-icons/fa';

export default function AdminCustomerSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    const guard = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: me, error: meErr } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      if (meErr || !me || me.role !== 'admin') {
        router.push('/');
      }
    };
    guard();
  }, [router]);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  const fetchWithAuth = async (url) => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) throw new Error('Erreur de session');
    const token = session?.access_token;
    return fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };

  const searchCustomers = async () => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError('Tape au moins 2 caractères.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(
        `/api/admin/users/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Erreur de recherche');
        setResults([]);
        return;
      }
      setResults(data.users || []);
    } catch (err) {
      setError(err.message || 'Erreur réseau');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await searchCustomers();
  };

  const copyToClipboard = async (value, id) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1200);
    } catch {
      // no-op
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="mb-4 inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <FaArrowLeft className="mr-2" />
          Retour admin
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Recherche client
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Recherche rapide par nom, prenom, email ou numero de telephone.
          </p>

          <form onSubmit={onSubmit} className="mt-4 flex gap-2">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: nicolas roujon / 0614 / gmail"
                className="w-full pl-9 pr-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>
            <button
              type="submit"
              disabled={!canSearch || loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Recherche...' : 'Rechercher'}
            </button>
          </form>

          {error ? (
            <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {results.map((u) => (
              <div
                key={u.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {u.name}
                    </p>
                    <p className="text-xs text-gray-500">{u.role}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString('fr-FR')
                      : ''}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FaEnvelope className="text-gray-400" />
                    <span className="truncate">{u.email || '—'}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(u.email, `e-${u.id}`)}
                      className="ml-auto text-blue-600 hover:text-blue-700"
                      title="Copier email"
                    >
                      <FaCopy />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaPhone className="text-gray-400" />
                    <span>{u.telephone || '—'}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(u.telephone, `t-${u.id}`)}
                      className="ml-auto text-blue-600 hover:text-blue-700"
                      title="Copier numero"
                    >
                      <FaCopy />
                    </button>
                  </div>
                </div>

                {copiedId === `e-${u.id}` || copiedId === `t-${u.id}` ? (
                  <p className="text-xs text-green-600 mt-2">Copie.</p>
                ) : null}
              </div>
            ))}

            {!loading && results.length === 0 && canSearch && !error ? (
              <div className="text-sm text-gray-500 border border-dashed rounded-lg p-4 text-center">
                Aucun client trouve pour cette recherche.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

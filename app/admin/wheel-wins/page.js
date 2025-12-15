'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  FaArrowLeft, 
  FaGift, 
  FaUser, 
  FaCalendarAlt, 
  FaCheckCircle, 
  FaTimesCircle,
  FaSpinner,
  FaSearch,
  FaFilter
} from 'react-icons/fa';
import Link from 'next/link';

export default function AdminWheelWins() {
  const router = useRouter();
  const [wheelWins, setWheelWins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'used', 'expired'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchWheelWins();
    }
  }, [user, filter]);

  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (userError || !userData || userData.role !== 'admin') {
        router.push('/login');
        return;
      }

      setUser(currentUser);
    } catch (err) {
      console.error('Erreur d\'authentification:', err);
      router.push('/login');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchWheelWins = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer tous les gains avec les informations utilisateur
      let query = supabase
        .from('wheel_wins')
        .select(`
          *,
          user:users!wheel_wins_user_id_fkey (
            id,
            email,
            nom,
            prenom
          )
        `)
        .order('created_at', { ascending: false });

      // Appliquer le filtre
      if (filter === 'active') {
        query = query.is('used_at', null).gte('valid_until', new Date().toISOString());
      } else if (filter === 'used') {
        query = query.not('used_at', 'is', null);
      } else if (filter === 'expired') {
        query = query.lt('valid_until', new Date().toISOString()).is('used_at', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setWheelWins(data || []);
    } catch (err) {
      console.error('Erreur récupération gains:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPrizeTypeLabel = (type) => {
    const labels = {
      'free_delivery': 'Livraison offerte',
      'free_drink': 'Boisson offerte',
      'discount': 'Réduction',
      'surprise': 'Surprise'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (win) => {
    const now = new Date();
    const validUntil = new Date(win.valid_until);
    const isExpired = validUntil < now;
    const isUsed = win.used_at !== null;

    if (isUsed) {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
          <FaCheckCircle className="inline mr-1" />
          Utilisé
        </span>
      );
    } else if (isExpired) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-semibold">
          <FaTimesCircle className="inline mr-1" />
          Expiré
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-semibold">
          <FaCheckCircle className="inline mr-1" />
          Actif
        </span>
      );
    }
  };

  const filteredWins = wheelWins.filter(win => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      win.promo_code?.toLowerCase().includes(search) ||
      win.user?.email?.toLowerCase().includes(search) ||
      win.user?.nom?.toLowerCase().includes(search) ||
      win.user?.prenom?.toLowerCase().includes(search) ||
      win.description?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: wheelWins.length,
    active: wheelWins.filter(w => !w.used_at && new Date(w.valid_until) >= new Date()).length,
    used: wheelWins.filter(w => w.used_at).length,
    expired: wheelWins.filter(w => !w.used_at && new Date(w.valid_until) < new Date()).length
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                <FaArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <FaGift className="text-yellow-500" />
                  Gains de la roue de la chance
                </h1>
                <p className="text-gray-600 mt-1">Tous les gains générés par la roue</p>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-green-50 rounded-lg shadow p-4">
              <div className="text-sm text-green-600 mb-1">Actifs</div>
              <div className="text-2xl font-bold text-green-700">{stats.active}</div>
            </div>
            <div className="bg-gray-50 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Utilisés</div>
              <div className="text-2xl font-bold text-gray-700">{stats.used}</div>
            </div>
            <div className="bg-red-50 rounded-lg shadow p-4">
              <div className="text-sm text-red-600 mb-1">Expirés</div>
              <div className="text-2xl font-bold text-red-700">{stats.expired}</div>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par code, email, nom..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    filter === 'active'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Actifs
                </button>
                <button
                  onClick={() => setFilter('used')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    filter === 'used'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Utilisés
                </button>
                <button
                  onClick={() => setFilter('expired')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    filter === 'expired'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Expirés
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des gains */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Erreur : {error}
          </div>
        ) : filteredWins.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FaGift className="text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun gain trouvé</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code promo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date création
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valable jusqu'au
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisé le
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWins.map((win) => (
                    <tr key={win.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaUser className="text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {win.user?.prenom} {win.user?.nom}
                            </div>
                            <div className="text-sm text-gray-500">{win.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getPrizeTypeLabel(win.prize_type)}
                        </div>
                        <div className="text-sm text-gray-500">{win.description}</div>
                        {win.prize_value && (
                          <div className="text-xs text-green-600 font-semibold">
                            {win.prize_type === 'discount' || win.prize_type === 'surprise'
                              ? `-${win.prize_value}%`
                              : `-${win.prize_value}€`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {win.promo_code ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-mono text-sm">
                            {win.promo_code}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <FaCalendarAlt className="inline mr-1" />
                        {new Date(win.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(win.valid_until).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(win)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {win.used_at ? (
                          <>
                            <FaCalendarAlt className="inline mr-1" />
                            {new Date(win.used_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


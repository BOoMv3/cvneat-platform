'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaArrowLeft, FaStar, FaTruck, FaSpinner, FaTrophy, FaMedal, FaAward } from 'react-icons/fa';

export default function DeliveryLeaderboard() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('rating'); // 'rating' ou 'deliveries'

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userError || !userData || userData.role !== 'admin') {
        router.push('/login');
        return;
      }

      await fetchLeaderboard();
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/delivery-leaderboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération du classement');
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Erreur fetchLeaderboard:', err);
      setError(err.message);
    }
  };

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (sortBy === 'rating') {
      if (b.average_rating !== a.average_rating) {
        return b.average_rating - a.average_rating;
      }
      return b.total_deliveries - a.total_deliveries;
    } else {
      if (b.total_deliveries !== a.total_deliveries) {
        return b.total_deliveries - a.total_deliveries;
      }
      return b.average_rating - a.average_rating;
    }
  });

  const getRankIcon = (index) => {
    if (index === 0) return <FaTrophy className="text-yellow-500" />;
    if (index === 1) return <FaMedal className="text-gray-400" />;
    if (index === 2) return <FaAward className="text-orange-500" />;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du classement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-bold mb-4">Erreur: {error}</p>
          <button
            onClick={fetchLeaderboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Retour au dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">🏆 Classement des livreurs</h1>
          <p className="text-gray-600 mt-2">Voir les livreurs les plus actifs et les mieux notés</p>
        </div>

        {/* Filtres de tri */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setSortBy('rating')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortBy === 'rating'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FaStar className="inline mr-2" />
            Trier par note
          </button>
          <button
            onClick={() => setSortBy('deliveries')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortBy === 'deliveries'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FaTruck className="inline mr-2" />
            Trier par activité
          </button>
        </div>

        {/* Tableau de classement */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Livreur
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Note moyenne
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre de notes
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Livraisons
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dernière livraison
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      Aucun livreur avec des livraisons ou des notes pour le moment
                    </td>
                  </tr>
                ) : (
                  sortedLeaderboard.map((driver, index) => (
                    <tr key={driver.livreur_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRankIcon(index) || (
                            <span className="text-lg font-semibold text-gray-700">
                              #{index + 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {driver.prenom} {driver.nom}
                          </div>
                          <div className="text-sm text-gray-500">{driver.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FaStar className="text-yellow-400" />
                          <span className="text-sm font-semibold text-gray-900">
                            {parseFloat(driver.average_rating || 0).toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500">/ 5</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {driver.total_ratings || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FaTruck className="text-blue-500" />
                          <span className="text-sm font-semibold text-gray-900">
                            {driver.total_deliveries || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {driver.last_delivery_at
                          ? new Date(driver.last_delivery_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'Jamais'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import DeliveryNavbar from '../../components/DeliveryNavbar';
import { FaArrowLeft, FaStar, FaTruck, FaSpinner, FaTrophy, FaMedal, FaAward } from 'react-icons/fa';

export default function DeliveryLeaderboard() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('rating'); // 'rating' ou 'deliveries'

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    // Re-trier quand sortBy change
    if (leaderboard.length > 0 && myStats) {
      const sorted = [...leaderboard].sort((a, b) => {
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
      setLeaderboard(sorted);
      
      // Mettre à jour mon rang
      const myIndex = sorted.findIndex(d => d.livreur_id === myStats.livreur_id);
      if (myIndex !== -1) {
        setMyRank(myIndex + 1);
        setMyStats(sorted[myIndex]);
      }
    }
  }, [sortBy]);

  useEffect(() => {
    // Re-trier quand sortBy change
    if (leaderboard.length > 0) {
      const sorted = [...leaderboard].sort((a, b) => {
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
      setLeaderboard(sorted);
      
      // Mettre à jour mon rang
      if (myStats) {
        const myIndex = sorted.findIndex(d => d.livreur_id === myStats.livreur_id);
        if (myIndex !== -1) {
          setMyRank(myIndex + 1);
        }
      }
    }
  }, [sortBy]);

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

      if (userError || !userData || userData.role !== 'delivery') {
        router.push('/login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchLeaderboard(user.id, session.access_token);
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (myUserId, token) => {
    try {
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        token = session.access_token;
      }

      // Utiliser l'API spécifique pour les livreurs
      const response = await fetch('/api/delivery/leaderboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || 'Erreur lors de la récupération du classement');
      }

      const data = await response.json();
      const leaderboardData = data.leaderboard || [];
      
      // Trier selon le critère sélectionné
      const sorted = [...leaderboardData].sort((a, b) => {
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

      setLeaderboard(sorted);
      
      // Trouver mon classement
      const myIndex = sorted.findIndex(d => d.livreur_id === myUserId);
      if (myIndex !== -1) {
        setMyRank(myIndex + 1);
        setMyStats(sorted[myIndex]);
      }
    } catch (err) {
      console.error('Erreur fetchLeaderboard:', err);
      setError(err.message);
    }
  };

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
            onClick={() => checkAuthAndFetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DeliveryNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/delivery/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Retour au dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">🏆 Classement des livreurs</h1>
          <p className="text-gray-600 mt-2">Voir votre position parmi tous les livreurs</p>
        </div>

        {/* Ma position */}
        {myStats && (
          <div className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
            <h2 className="text-xl font-semibold mb-4">Votre position</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">
                  {getRankIcon(myRank - 1) || `#${myRank}`}
                </div>
                <div className="text-sm opacity-90">Rang</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1 flex items-center justify-center gap-1">
                  <FaStar className="text-yellow-300" />
                  {parseFloat(myStats.average_rating || 0).toFixed(2)}
                </div>
                <div className="text-sm opacity-90">Note moyenne</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1 flex items-center justify-center gap-1">
                  <FaTruck />
                  {myStats.total_deliveries || 0}
                </div>
                <div className="text-sm opacity-90">Livraisons</div>
              </div>
            </div>
          </div>
        )}

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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      Aucun livreur avec des livraisons ou des notes pour le moment
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((driver, index) => {
                    const isMe = myStats && driver.livreur_id === myStats.livreur_id;
                    return (
                      <tr
                        key={driver.livreur_id}
                        className={`hover:bg-gray-50 ${isMe ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getRankIcon(index) || (
                              <span className={`text-lg font-semibold ${isMe ? 'text-blue-700' : 'text-gray-700'}`}>
                                #{index + 1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className={`text-sm font-medium ${isMe ? 'text-blue-900 font-bold' : 'text-gray-900'}`}>
                              {driver.prenom} {driver.nom}
                              {isMe && <span className="ml-2 text-blue-600">(Vous)</span>}
                            </div>
                            <div className="text-sm text-gray-500">{driver.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <FaStar className="text-yellow-400" />
                            <span className={`text-sm font-semibold ${isMe ? 'text-blue-900' : 'text-gray-900'}`}>
                              {parseFloat(driver.average_rating || 0).toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500">/ 5</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`text-sm ${isMe ? 'text-blue-900 font-semibold' : 'text-gray-900'}`}>
                            {driver.total_ratings || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <FaTruck className="text-blue-500" />
                            <span className={`text-sm font-semibold ${isMe ? 'text-blue-900' : 'text-gray-900'}`}>
                              {driver.total_deliveries || 0}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


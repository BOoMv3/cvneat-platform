'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  FaChartLine, 
  FaChartBar, 
  FaChartPie,
  FaCalendarAlt,
  FaEuroSign,
  FaShoppingCart,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';

export default function PartnerAnalytics() {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Vérifier le rôle
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || userData.role !== 'restaurant') {
        router.push('/');
        return;
      }

      setUser(session.user);

      // Récupérer le restaurant
      const { data: resto, error: restoError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (restoError || !resto) {
        router.push('/profil-partenaire');
        return;
      }

      setRestaurant(resto);
      await fetchAnalytics(resto.id, period);
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const fetchAnalytics = async (restaurantId, selectedPeriod) => {
    try {
      const response = await fetch(`/api/partner/analytics?restaurantId=${restaurantId}&period=${selectedPeriod}`);
      const data = await response.json();
      if (response.ok) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Erreur récupération analytics:', error);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (restaurant) {
      fetchAnalytics(restaurant.id, newPeriod);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Aucune donnée disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600">{restaurant?.nom}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/partner')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Période sélector */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Période :</span>
            {[
              { value: 'week', label: '7 jours' },
              { value: 'month', label: 'Ce mois' },
              { value: 'year', label: 'Cette année' }
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => handlePeriodChange(p.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total commandes</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaEuroSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalRevenue}€</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FaChartLine className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Panier moyen</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.averageOrderValue}€</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FaCheckCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Taux de réussite</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.completionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Graphique des commandes par jour */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Commandes par jour</h2>
            <div className="space-y-4">
              {analytics.dailyStats.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{day.date}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium">{day.orders} commandes</span>
                    <span className="text-sm text-gray-500">{day.revenue}€</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plats les plus populaires */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Plats les plus populaires</h2>
            <div className="space-y-4">
              {analytics.popularItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-gray-600">{item.quantity} commandes</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Détails des commandes */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Détails des commandes</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{analytics.completedOrders}</div>
                <div className="text-sm text-gray-600">Commandes livrées</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{analytics.cancelledOrders}</div>
                <div className="text-sm text-gray-600">Commandes annulées</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {analytics.totalOrders - analytics.completedOrders - analytics.cancelledOrders}
                </div>
                <div className="text-sm text-gray-600">En cours</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  FaChartLine, 
  FaCalendarAlt,
  FaEuroSign,
  FaUtensils,
  FaClock,
  FaStar,
  FaUsers
} from 'react-icons/fa';

export default function PartnerAnalytics() {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year
  const [analytics, setAnalytics] = useState({
    orders: [],
    revenue: [],
    popularItems: [],
    customerStats: {},
    deliveryStats: {}
  });
  
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

      // Autoriser les restaurants ET les admins
      if (userError || !userData || (userData.role !== 'restaurant' && userData.role !== 'admin')) {
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
      await fetchAnalytics(resto.id);
      setLoading(false);
    };

    fetchData();
  }, [router, timeRange]);

  const fetchAnalytics = async (restaurantId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ Aucune session pour analytics');
        return;
      }
      
      const response = await fetch(`/api/partner/analytics?restaurantId=${restaurantId}&timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Analytics reçues:', data);
        setAnalytics(data);
      } else {
        console.error('❌ Erreur API analytics:', data);
      }
    } catch (error) {
      console.error('Erreur récupération analytics:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'week': return '7 derniers jours';
      case 'month': return '30 derniers jours';
      case 'year': return '12 derniers mois';
      default: return '7 derniers jours';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Analytics & Statistiques</h1>
              <p className="text-gray-600">{restaurant?.nom}</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
                <option value="year">12 derniers mois</option>
              </select>
              <button
                onClick={() => router.push('/partner')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900">
            Période analysée : <span className="text-blue-600">{getTimeRangeLabel()}</span>
          </h2>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaUtensils className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total commandes</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics.orders?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaEuroSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(analytics.revenue?.total || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FaUsers className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clients uniques</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics.customerStats?.uniqueCustomers || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FaStar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Note moyenne</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics.customerStats?.averageRating?.toFixed(1) || 'N/A'} ⭐
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Graphiques et analyses détaillées */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Évolution des commandes */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des commandes</h3>
            {analytics.orders && analytics.orders.length > 0 ? (
              <div className="space-y-3">
                {analytics.orders.slice(-7).map((order, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(order.date)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {order.count} commande{order.count > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
            )}
          </div>

          {/* Évolution du chiffre d'affaires */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution du CA</h3>
            {analytics.revenue && analytics.revenue.data && analytics.revenue.data.length > 0 ? (
              <div className="space-y-3">
                {analytics.revenue.data.slice(-7).map((rev, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(rev.date)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(rev.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
            )}
          </div>

          {/* Articles les plus populaires */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Articles les plus populaires</h3>
            {analytics.popularItems && analytics.popularItems.length > 0 ? (
              <div className="space-y-3">
                {analytics.popularItems.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {item.orders} commande{item.orders > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
            )}
          </div>

          {/* Statistiques de livraison */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques de livraison</h3>
            {analytics.deliveryStats ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Temps moyen de préparation</span>
                  <span className="text-sm font-medium text-gray-900">
                    {analytics.deliveryStats.averagePreparationTime || 0} min
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Temps moyen de livraison</span>
                  <span className="text-sm font-medium text-gray-900">
                    {analytics.deliveryStats.averageDeliveryTime || 0} min
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Taux de satisfaction</span>
                  <span className="text-sm font-medium text-gray-900">
                    {analytics.deliveryStats.satisfactionRate || 0}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
            )}
          </div>
        </div>

        {/* Résumé des performances */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé des performances</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {analytics.orders?.length > 0 ? 
                  Math.round((analytics.orders.length / getTimeRangeDays()) * 100) / 100 : 0
                }
              </div>
              <p className="text-sm text-gray-600">Commandes par jour</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {analytics.revenue?.total > 0 ? 
                  formatCurrency(analytics.revenue.total / getTimeRangeDays()) : formatCurrency(0)
                }
              </div>
              <p className="text-sm text-gray-600">CA moyen par jour</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {analytics.revenue?.total > 0 && analytics.orders?.length > 0 ? 
                  formatCurrency(analytics.revenue.total / analytics.orders.length) : formatCurrency(0)
                }
              </div>
              <p className="text-sm text-gray-600">Panier moyen</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function getTimeRangeDays() {
    switch (timeRange) {
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
      default: return 7;
    }
  }
} 
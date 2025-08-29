'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { FaHome } from 'react-icons/fa';

export default function DeliveryDashboard() {
  const [user, setUser] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    completedDeliveries: 0,
    totalEarnings: 0,
    averageDeliveryTime: 0,
    rating: 0,
    totalDeliveries: 0
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const router = useRouter();

  const [currentOrder, setCurrentOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setAuthError('Vous devez être connecté pour accéder à cette page');
        setLoading(false);
        return;
      }

      // Vérifier le rôle
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || userData.role !== 'delivery') {
        setAuthError(`Accès refusé. Votre rôle est : ${userData ? userData.role : 'aucun'}. Seuls les livreurs peuvent accéder à cette page.`);
        setLoading(false);
        return;
      }

      setUser(session.user);
      await fetchStats();
      await fetchAvailableOrders();
      await fetchCurrentOrder();
      
      // Vérifier les nouvelles commandes toutes les 30 secondes
      const interval = setInterval(() => {
        fetchAvailableOrders();
        fetchCurrentOrder();
      }, 30000);

      return () => clearInterval(interval);
    };

    checkAuth();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/delivery/stats');
      const data = await response.json();
      
      if (response.ok) {
        setStats({
          todayDeliveries: data.today_deliveries || 0,
          completedDeliveries: data.completed_deliveries || 0,
          totalEarnings: data.total_earnings || 0,
          averageDeliveryTime: data.average_delivery_time || 0,
          rating: data.average_rating || 0,
          totalDeliveries: data.total_deliveries || 0
        });
      }
    } catch (error) {
      console.error('Erreur recuperation stats:', error);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const response = await fetch('/api/delivery/available-orders');
      const data = await response.json();
      
      if (response.ok) {
        setDeliveries(data.slice(0, 5)); // Limiter a 5 commandes
      }
    } catch (error) {
      console.error('Erreur recuperation commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentOrder = async () => {
    try {
      const response = await fetch('/api/delivery/current-order');
      const data = await response.json();
      
      if (response.ok && data.order) {
        setCurrentOrder(data.order);
      }
    } catch (error) {
      console.error('Erreur récupération commande actuelle:', error);
    }
  };

  const completeDelivery = async (orderId) => {
    try {
      const response = await fetch(`/api/delivery/complete-delivery/${orderId}`, {
        method: 'POST'
      });

      if (response.ok) {
        setCurrentOrder(null);
        fetchStats();
        fetchAvailableOrders();
      }
    } catch (error) {
      console.error('Erreur finalisation livraison:', error);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      const response = await fetch(`/api/delivery/accept-order/${orderId}`, {
        method: 'POST'
      });

      if (response.ok) {
        fetchAvailableOrders();
        fetchStats();
      }
    } catch (error) {
      console.error('Erreur acceptation commande:', error);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center">
            <h2 className="text-lg font-semibold mb-2">Accès refusé</h2>
            <p className="mb-4">{authError}</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Se connecter
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-3 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col space-y-4 mb-6 sm:mb-8">
          {/* Bouton retour et titre */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white p-3 sm:p-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              title="Retour à l'accueil"
            >
              <FaHome className="h-6 w-6 sm:h-5 sm:w-5" />
              <span className="text-base sm:text-sm font-medium">Accueil</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Tableau de bord livreur</h1>
            </div>
          </div>
          
          {/* Bouton dashboard avancé */}
          <div className="flex justify-center sm:justify-end">
            <button
              onClick={() => router.push('/delivery/dashboard')}
              className="bg-blue-600 text-white px-4 sm:px-6 py-3 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium w-full sm:w-auto"
            >
              Dashboard avancé
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Livraisons aujourd'hui</h3>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.todayDeliveries}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Total livraisons</h3>
            <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{stats.totalDeliveries}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Livraisons terminées</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.completedDeliveries}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Gains totaux</h3>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.totalEarnings.toFixed(2)}€</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Temps moyen</h3>
            <p className="text-2xl sm:text-3xl font-bold text-orange-600">{stats.averageDeliveryTime} min</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Note moyenne</h3>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.rating.toFixed(1)} ⭐</p>
          </div>
        </div>

        {/* Commande actuelle en cours de livraison */}
        {currentOrder && (
          <div className="bg-blue-50 border border-blue-200 p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-blue-900 mb-4">🚚 Livraison en cours</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Détails de la commande</h3>
                <p className="text-xs sm:text-sm text-blue-800 mb-1">
                  <strong>Restaurant:</strong> {currentOrder.restaurant_nom}
                </p>
                <p className="text-xs sm:text-sm text-blue-800 mb-1">
                  <strong>Client:</strong> {currentOrder.customer_name}
                </p>
                <p className="text-xs sm:text-sm text-blue-800 mb-1">
                  <strong>Adresse:</strong> {currentOrder.delivery_address}
                </p>
                <p className="text-xs sm:text-sm text-blue-800 mb-1">
                  <strong>Frais de livraison:</strong> {currentOrder.delivery_fee}€
                </p>
              </div>
              <div className="text-center md:text-right">
                <button
                  onClick={() => completeDelivery(currentOrder.id)}
                  className="bg-green-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base"
                >
                  ✅ Marquer comme livrée
                </button>
                <p className="text-xs text-blue-600 mt-2">
                  Commande #{currentOrder.id} - {new Date(currentOrder.created_at).toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-xl font-bold mb-4">Commandes disponibles</h2>
          {deliveries.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <p className="text-sm sm:text-base">Aucune commande disponible pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {deliveries.map(delivery => (
                <div key={delivery.id} className="border rounded-lg p-4 bg-gray-50 hover:shadow-md transition-shadow">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{delivery.restaurant_nom}</h3>
                      <p className="text-gray-600 text-sm">{delivery.customer_name}</p>
                      <p className="text-gray-500 text-sm">{delivery.delivery_address}</p>
                      <p className="text-green-600 font-medium text-lg">Frais: {delivery.delivery_fee}€</p>
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-gray-500 text-sm mb-3">
                        {new Date(delivery.created_at).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <button 
                        onClick={() => acceptOrder(delivery.id)}
                        className="w-full sm:w-auto bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                      >
                        Accepter
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => router.push('/delivery/history')}
            className="bg-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
          >
            Historique
          </button>
          <button
            onClick={() => router.push('/delivery/reviews')}
            className="bg-yellow-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm sm:text-base"
          >
            Avis clients
          </button>
        </div>
      </div>
    </main>
  );
}

// Desactiver le rendu statique pour cette page
export const dynamic = 'force-dynamic'; 
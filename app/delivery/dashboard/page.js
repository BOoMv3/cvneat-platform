'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import DeliveryNotifications from '@/components/DeliveryNotifications';
import DeliveryMap from '@/components/DeliveryMap';
import DeliveryChat from '@/components/DeliveryChat';
import { useRouter } from 'next/navigation';
import { FaCalendarAlt } from 'react-icons/fa';
import { FaStar } from 'react-icons/fa';
import { FaDownload, FaChartLine, FaBell, FaComments } from 'react-icons/fa';

export default function DeliveryDashboard() {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [stats, setStats] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [deliveryId, setDeliveryId] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Récupérer l'ID du livreur depuis le token ou la session
    const token = localStorage.getItem('token');
    if (token) {
      // Décoder le token pour récupérer l'ID (simulation)
      // En production, vous utiliseriez une vraie décodification JWT
      setDeliveryId('current-user-id'); // À remplacer par l'ID réel
    }
    
    fetchAvailableOrders();
    fetchStats();
    fetchCurrentOrder();
  }, []);

  const fetchAvailableOrders = async () => {
    try {
      const response = await fetch('/api/delivery/available-orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setAvailableOrders(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes disponibles:', error);
    }
  };

  const fetchCurrentOrder = async () => {
    try {
      const response = await fetch('/api/delivery/current-order', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setCurrentOrder(data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération de la commande en cours:', error);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/delivery/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      const response = await fetch(`/api/delivery/accept-order/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchAvailableOrders();
        fetchCurrentOrder();
      }
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de la commande:', error);
    }
  };

  const updateOrderStatus = async (status) => {
    try {
      const response = await fetch(`/api/delivery/order/${currentOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchCurrentOrder();
        if (status === 'livree') {
          fetchStats();
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  const toggleAvailability = async () => {
    try {
      const response = await fetch('/api/delivery/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_available: !isAvailable })
      });

      if (response.ok) {
        setIsAvailable(!isAvailable);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la disponibilité:', error);
    }
  };

  const exportEarnings = async () => {
    try {
      const response = await fetch('/api/delivery/export-earnings');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gains_livreur_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Erreur export gains:', error);
    }
  };

  return (
    <AuthGuard allowedRoles={['delivery']}>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
          {/* Header avec notifications */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Livreur</h1>
              <p className="text-gray-600 mt-1">Gérez vos livraisons et suivez vos performances</p>
            </div>
            <div className="flex items-center space-x-4">
              <DeliveryNotifications deliveryId={deliveryId} />
              <button
                onClick={() => router.push('/delivery/history')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 transform hover:scale-105"
              >
                <FaCalendarAlt className="h-4 w-4" />
                <span>Historique</span>
              </button>
              <button
                onClick={() => router.push('/delivery/reviews')}
                className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all duration-200 transform hover:scale-105"
              >
                <FaStar className="h-4 w-4" />
                <span>Avis</span>
              </button>
              <button
                onClick={exportEarnings}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 transform hover:scale-105"
              >
                <FaDownload className="h-4 w-4" />
                <span>Exporter gains</span>
              </button>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {isAvailable ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
            </div>
          </div>

          {/* Statistiques améliorées */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Livraisons Totales</p>
                  <p className="text-3xl font-bold">{stats?.total_deliveries || 0}</p>
                </div>
                <div className="bg-blue-400 bg-opacity-30 p-3 rounded-full">
                  <FaChartLine className="h-6 w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Gains Totaux</p>
                  <p className="text-3xl font-bold">{stats?.total_earnings?.toFixed(2) || 0}€</p>
                </div>
                <div className="bg-green-400 bg-opacity-30 p-3 rounded-full">
                  <FaDownload className="h-6 w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Note Moyenne</p>
                  <p className="text-3xl font-bold">{stats?.rating?.toFixed(1) || 0}/5</p>
                </div>
                <div className="bg-yellow-400 bg-opacity-30 p-3 rounded-full">
                  <FaStar className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Statut</p>
                  <p className="text-xl font-bold">{isAvailable ? 'Actif' : 'Inactif'}</p>
                </div>
                <div className="bg-purple-400 bg-opacity-30 p-3 rounded-full">
                  <FaBell className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Disponibilité améliorée */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Statut de disponibilité</h3>
                <p className="text-gray-600 mt-1">
                  {isAvailable ? 'Vous êtes actuellement disponible pour les livraisons' : 'Vous êtes actuellement indisponible'}
                </p>
              </div>
              <button
                onClick={toggleAvailability}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
                  isAvailable
                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg'
                    : 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                }`}
              >
                {isAvailable ? 'Se mettre indisponible' : 'Se mettre disponible'}
              </button>
            </div>
          </div>

          {/* Commande en cours améliorée */}
          {currentOrder && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Commande en cours</h2>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      #{currentOrder.id}
                    </span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      {currentOrder.status === 'en_livraison' ? 'En livraison' : 'Prêt à livrer'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">🍽️ Restaurant</h3>
                      <p className="text-gray-700 font-medium">{currentOrder.restaurant_nom}</p>
                      <p className="text-gray-600 text-sm">{currentOrder.restaurant_adresse}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">👤 Client</h3>
                      <p className="text-gray-700 font-medium">{currentOrder.customer_name}</p>
                      <p className="text-gray-600 text-sm">{currentOrder.customer_phone}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">🏠 Adresse de livraison</h3>
                      <p className="text-gray-700">{currentOrder.delivery_address}</p>
                    </div>
                    
                    <div className="flex space-x-3">
                      {currentOrder.status === 'en_livraison' && (
                        <button
                          onClick={() => updateOrderStatus('livree')}
                          className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 transform hover:scale-105 font-semibold"
                        >
                          ✅ Marquer comme livrée
                        </button>
                      )}
                      <button
                        onClick={() => setChatOpen(true)}
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 font-semibold"
                      >
                        <FaComments className="h-4 w-4 inline mr-2" />
                        Chat
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <DeliveryMap
                      restaurantAddress={currentOrder.restaurant_adresse}
                      deliveryAddress={currentOrder.delivery_address}
                      deliveryId={deliveryId}
                      orderId={currentOrder.id}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Commandes disponibles améliorées */}
          {isAvailable && !currentOrder && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Commandes disponibles</h2>
                <p className="text-gray-600 mt-1">Acceptez une nouvelle livraison</p>
              </div>
              <div className="divide-y">
                {availableOrders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaBell className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium">Aucune commande disponible</p>
                    <p className="text-sm">Les nouvelles commandes apparaîtront ici</p>
                  </div>
                ) : (
                  availableOrders.map((order) => (
                    <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              #{order.id}
                            </span>
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                              {order.delivery_fee}€
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(order.created_at).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <h4 className="font-semibold text-gray-900 mb-1">🍽️ Restaurant</h4>
                              <p className="text-gray-700 font-medium">{order.restaurant_nom}</p>
                              <p className="text-gray-600 text-sm">{order.restaurant_adresse}</p>
                            </div>
                            
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <h4 className="font-semibold text-gray-900 mb-1">🏠 Livraison</h4>
                              <p className="text-gray-700 font-medium">{order.customer_name}</p>
                              <p className="text-gray-600 text-sm">{order.delivery_address}</p>
                            </div>
                          </div>
                          
                          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                            <span>Total: {order.total}€</span>
                            <span>Frais: {order.delivery_fee}€</span>
                            <span>Est. {order.estimated_time} min</span>
                          </div>
                        </div>
                        
                        <div className="ml-6">
                          <button
                            onClick={() => acceptOrder(order.id)}
                            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 font-semibold shadow-lg"
                          >
                            ✅ Accepter
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>

        {/* Chat Modal */}
        {currentOrder && (
          <DeliveryChat
            orderId={currentOrder.id}
            customerName={currentOrder.customer_name}
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>
    </AuthGuard>
  );
} 
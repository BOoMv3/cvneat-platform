'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';

export default function DeliveryDashboard() {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [stats, setStats] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  return (
    <AuthGuard allowedRoles={['delivery']}>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-500 text-sm font-medium">Livraisons Totales</h3>
              <p className="text-3xl font-bold">{stats?.total_deliveries || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-500 text-sm font-medium">Gains Totaux</h3>
              <p className="text-3xl font-bold">{stats?.total_earnings?.toFixed(2) || 0}€</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-500 text-sm font-medium">Note Moyenne</h3>
              <p className="text-3xl font-bold">{stats?.rating?.toFixed(1) || 0}/5</p>
            </div>
          </div>

          {/* Disponibilité */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Statut</h3>
                <p className="text-gray-600">
                  {isAvailable ? 'Disponible pour les livraisons' : 'Indisponible'}
                </p>
              </div>
              <button
                onClick={toggleAvailability}
                className={`px-4 py-2 rounded-lg font-medium ${
                  isAvailable
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isAvailable ? 'Se mettre indisponible' : 'Se mettre disponible'}
              </button>
            </div>
          </div>

          {/* Commande en cours */}
          {currentOrder && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Commande en cours</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Restaurant</h3>
                  <p className="text-gray-600">{currentOrder.restaurant_nom}</p>
                  <p className="text-gray-600">{currentOrder.restaurant_adresse}</p>
                </div>
                <div>
                  <h3 className="font-medium">Adresse de livraison</h3>
                  <p className="text-gray-600">{currentOrder.adresse_livraison}</p>
                </div>
                <div className="flex space-x-2">
                  {currentOrder.status === 'en_livraison' && (
                    <button
                      onClick={() => updateOrderStatus('livree')}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Marquer comme livrée
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Commandes disponibles */}
          {isAvailable && !currentOrder && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Commandes disponibles</h2>
              </div>
              <div className="divide-y">
                {availableOrders.map((order) => (
                  <div key={order.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">Commande #{order.id}</h3>
                        <p className="text-gray-600">{order.restaurant_nom}</p>
                        <p className="text-gray-600">{order.restaurant_adresse}</p>
                        <p className="text-gray-600">{order.adresse_livraison}</p>
                      </div>
                      <button
                        onClick={() => acceptOrder(order.id)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Accepter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
} 
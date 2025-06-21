'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeliveryDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    completedDeliveries: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStats();
    fetchAvailableOrders();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/delivery/stats');
      const data = await response.json();
      
      if (response.ok) {
        setStats({
          todayDeliveries: data.total_deliveries || 0,
          completedDeliveries: data.total_deliveries || 0,
          totalEarnings: data.total_earnings || 0
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

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Tableau de bord livreur</h1>
          <button
            onClick={() => router.push('/delivery/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Dashboard avance
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Livraisons totales</h3>
            <p className="text-3xl font-bold">{stats.todayDeliveries}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Livraisons terminees</h3>
            <p className="text-3xl font-bold">{stats.completedDeliveries}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Gains totaux</h3>
            <p className="text-3xl font-bold">{stats.totalEarnings.toFixed(2)}€</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Commandes disponibles</h2>
          {deliveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucune commande disponible pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveries.map(delivery => (
                <div key={delivery.id} className="border-b pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{delivery.restaurant_nom}</p>
                      <p className="text-gray-600">{delivery.customer_name}</p>
                      <p className="text-sm text-gray-500">{delivery.delivery_address}</p>
                      <p className="text-sm text-green-600 font-medium">Frais: {delivery.delivery_fee}€</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(delivery.created_at).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <button 
                        onClick={() => acceptOrder(delivery.id)}
                        className="mt-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm"
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

        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => router.push('/delivery/history')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Historique
          </button>
          <button
            onClick={() => router.push('/delivery/reviews')}
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
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
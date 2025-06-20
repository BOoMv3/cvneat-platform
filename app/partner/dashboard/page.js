'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';

export default function PartnerDashboard() {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    fetchMenu();
    fetchStats();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders/restaurant/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes:', error);
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await fetch('/api/restaurants/me/menu', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setMenu(data);
    } catch (error) {
      console.error('Erreur lors de la récupération du menu:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/restaurants/me/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  };

  return (
    <AuthGuard allowedRoles={['partner']}>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-500 text-sm font-medium">Commandes Aujourd'hui</h3>
              <p className="text-3xl font-bold">{stats?.today_orders || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-500 text-sm font-medium">Commandes en Attente</h3>
              <p className="text-3xl font-bold">{stats?.pending_orders || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-500 text-sm font-medium">Chiffre d'Affaires</h3>
              <p className="text-3xl font-bold">{stats?.total_revenue?.toFixed(2) || 0}€</p>
            </div>
          </div>

          {/* Onglets */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="border-b">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-6 py-4 text-sm font-medium ${
                    activeTab === 'orders'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Commandes
                </button>
                <button
                  onClick={() => setActiveTab('menu')}
                  className={`px-6 py-4 text-sm font-medium ${
                    activeTab === 'menu'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Menu
                </button>
              </nav>
            </div>

            {/* Contenu des onglets */}
            <div className="p-6">
              {activeTab === 'orders' ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">Commande #{order.id}</h3>
                          <p className="text-gray-600">{order.client_email}</p>
                          <p className="text-gray-600">{order.adresse_livraison}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded text-sm ${
                            order.status === 'livree' ? 'bg-green-100 text-green-800' :
                            order.status === 'en_preparation' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status}
                          </span>
                          {order.status === 'en_attente' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'en_preparation')}
                              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Préparer
                            </button>
                          )}
                          {order.status === 'en_preparation' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'pret_a_livrer')}
                              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              Prêt à livrer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <button className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Ajouter un plat
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menu.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <h3 className="font-medium">{item.nom}</h3>
                        <p className="text-gray-600">{item.description}</p>
                        <p className="text-lg font-semibold mt-2">{item.prix.toFixed(2)}€</p>
                        <div className="mt-4 flex space-x-2">
                          <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
                            Modifier
                          </button>
                          <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
} 
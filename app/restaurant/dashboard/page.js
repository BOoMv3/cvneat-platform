'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaUtensils, FaClipboardList, FaCog, FaSignOutAlt } from 'react-icons/fa';

export default function RestaurantDashboard() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchRestaurantData();
  }, []);

  const fetchRestaurantData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/restaurants/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors de la récupération des données');
      const data = await response.json();
      setRestaurant(data.restaurant);
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Tableau de bord</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              <FaSignOutAlt className="inline mr-2" />
              Déconnexion
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}

          {restaurant && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">{restaurant.name}</h2>
              <p className="text-gray-600">{restaurant.description}</p>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  {restaurant.address}, {restaurant.city} {restaurant.postalCode}
                </p>
                <p className="text-sm text-gray-500">Tél: {restaurant.phone}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium mb-2">Commandes en attente</h3>
              <p className="text-3xl font-bold">{stats.pendingOrders}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium mb-2">Total des commandes</h3>
              <p className="text-3xl font-bold">{stats.totalOrders}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium mb-2">Revenu total</h3>
              <p className="text-3xl font-bold">{stats.totalRevenue}€</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => router.push('/restaurant/menu')}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <FaUtensils className="text-2xl mr-4" />
                <div>
                  <h3 className="text-lg font-medium">Gérer le menu</h3>
                  <p className="text-gray-600">Ajouter, modifier ou supprimer des plats</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/restaurant/orders')}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <FaClipboardList className="text-2xl mr-4" />
                <div>
                  <h3 className="text-lg font-medium">Gérer les commandes</h3>
                  <p className="text-gray-600">Voir et gérer les commandes en cours</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/restaurant/settings')}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <FaCog className="text-2xl mr-4" />
                <div>
                  <h3 className="text-lg font-medium">Paramètres</h3>
                  <p className="text-gray-600">Gérer les informations du restaurant</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
} 
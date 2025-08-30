"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { FaHome } from 'react-icons/fa';
import { FaUsers, FaStore, FaShoppingCart, FaTruck } from 'react-icons/fa';

// 🚨 FORCAGE REDEPLOIEMENT COMPLET - Page admin COMPLÈTEMENT NOUVELLE
// 🎯 PROBLÈME : Le serveur en ligne a un cache corrompu !
// 🔥 SOLUTION : Changer TOUTE la structure de la page !
export default function AdminDashboardForceDeploy() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 🚨 FORCAGE REDEPLOIEMENT - Cette page DOIT être recompilée !
      console.log('🚨 FORCAGE REDEPLOIEMENT - Page admin COMPLÈTEMENT NOUVELLE');
      
      // Récupération directe depuis Supabase
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: restaurantsData } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(usersData || []);
      setRestaurants(restaurantsData || []);
      setOrders(ordersData || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setLoading(false);
    }
  };

  // Filtrage des partenaires en attente
  const pendingPartners = users.filter(user => 
    user.role === 'restaurant' && 
    restaurants.find(r => r.user_id === user.id)?.status === 'pending'
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🚨 BANNIÈRE D'ALERTE ROUGE TRÈS VISIBLE */}
      <div className="bg-red-600 text-white p-6 text-center font-bold text-xl shadow-lg">
        🚨 ATTENTION : Cette page a été recompilée avec des CARDS responsives pour mobile !
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* 🚨 TITRE FORCAGE REDEPLOIEMENT */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          🚨 FORCAGE REDEPLOIEMENT - Page Admin COMPLÈTEMENT NOUVELLE
        </h1>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Total Utilisateurs</h3>
            <p className="text-3xl font-bold text-blue-600">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Total Restaurants</h3>
            <p className="text-3xl font-bold text-green-600">{restaurants.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Total Commandes</h3>
            <p className="text-3xl font-bold text-purple-600">{orders.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">Partenaires en Attente</h3>
            <p className="text-3xl font-bold text-orange-600">{pendingPartners.length}</p>
          </div>
        </div>

        {/* Gestion des partenaires en attente */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Partenaires en Attente de Validation</h2>
          </div>
          <div className="p-6">
            {pendingPartners.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun partenaire en attente de validation</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingPartners.map((user) => {
                  const restaurant = restaurants.find(r => r.user_id === user.id);
                  return (
                    <div key={user.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{user.email}</h3>
                          <p className="text-sm text-gray-600">Restaurant: {restaurant?.name || 'Nom non défini'}</p>
                          <p className="text-sm text-gray-500">Créé le: {new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            Valider
                          </button>
                          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Refuser
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Toutes les commandes - CARDS RESPONSIVES */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Toutes les Commandes</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Commande #{order.id.slice(0, 8)}</h3>
                        <p className="text-sm text-gray-600">Client: {order.user_id ? order.user_id.slice(0, 8) : 'Anonyme'}</p>
                        <p className="text-sm text-gray-500">Restaurant: {order.restaurant_id ? order.restaurant_id.slice(0, 8) : 'N/A'}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {order.total_amount ? `${order.total_amount}€` : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-sm text-gray-600">
                        Créée le: {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                          Voir détails
                        </button>
                        <button className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors">
                          Modifier
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tous les restaurants - CARDS RESPONSIVES */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Tous les Restaurants</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {restaurants.map((restaurant) => (
                <div key={restaurant.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                        <p className="text-sm text-gray-600">{restaurant.address}</p>
                        <p className="text-sm text-gray-500">Propriétaire: {restaurant.user_id ? restaurant.user_id.slice(0, 8) : 'N/A'}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          restaurant.status === 'active' ? 'bg-green-100 text-green-800' :
                          restaurant.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          restaurant.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {restaurant.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-sm text-gray-600">
                        Créé le: {new Date(restaurant.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                          Voir détails
                        </button>
                        <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors">
                          Activer
                        </button>
                        <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors">
                          Désactiver
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Utilisateurs et rôles - CARDS RESPONSIVES */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Utilisateurs et Rôles</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              {users.map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{user.email}</h3>
                        <p className="text-sm text-gray-600">ID: {user.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-500">Créé le: {new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'restaurant' ? 'bg-green-100 text-green-800' :
                          user.role === 'delivery' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                          user.is_blocked ? 'bg-red-500' : 'bg-green-500'
                        }`}></span>
                        <span className="text-sm text-gray-600">
                          {user.is_blocked ? 'Bloqué' : 'Actif'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                          Modifier rôle
                        </button>
                        <button className={`px-3 py-1 rounded text-sm transition-colors ${
                          user.is_blocked 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}>
                          {user.is_blocked ? 'Débloquer' : 'Bloquer'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
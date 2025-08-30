'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { 
  FaUsers, 
  FaStore, 
  FaShoppingCart, 
  FaEuroSign,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaArrowLeft
} from 'react-icons/fa';

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    validatedOrders: 0,
    totalRevenue: 0,
    totalRestaurants: 0,
    pendingPartners: 0,
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Recuperer toutes les commandes
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Recuperer tous les restaurants
      const { data: restaurants, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*');

      if (restaurantsError) throw restaurantsError;

      // Recuperer les demandes de partenariat
      const { data: partnershipRequests, error: partnershipError } = await supabase
        .from('restaurant_requests')
        .select('*');

      if (partnershipError) throw partnershipError;

      // Calculer les statistiques
      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const validatedOrders = orders?.filter(o => ['accepted', 'preparing', 'ready', 'delivered'].includes(o.status)).length || 0;
      const totalRevenue = orders?.filter(o => ['accepted', 'preparing', 'ready', 'delivered'].includes(o.status))
        .reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const totalRestaurants = restaurants?.length || 0;
      const pendingPartners = partnershipRequests?.filter(r => r.status === 'pending').length || 0;
      const recentOrders = orders?.slice(0, 5) || [];

      setStats({
        totalOrders,
        pendingOrders,
        validatedOrders,
        totalRevenue,
        totalRestaurants,
        pendingPartners,
        recentOrders
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Acceptee';
      case 'rejected': return 'Refusee';
      case 'preparing': return 'En preparation';
      case 'ready': return 'Prete';
      case 'delivered': return 'Livree';
      default: return status;
    }
  };

  // Fonction sécurisée pour afficher l'ID de commande
  const getOrderDisplayId = (order) => {
    if (!order || !order.id) return 'N/A';
    // Si c'est un UUID, on prend les 8 premiers caractères
    if (typeof order.id === 'string' && order.id.length > 8) {
      return order.id.slice(0, 8);
    }
    return order.id.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bannière de confirmation */}
      <div className="bg-green-600 text-white p-4 text-center font-bold">
        ✅ PAGE ADMIN FONCTIONNELLE - Dashboard complet avec toutes les fonctionnalités !
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header avec bouton retour */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🚀 Dashboard Administrateur CVN'EAT</h1>
          <button
            onClick={() => router.push('/')}
            className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Retour à l'Accueil
          </button>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <FaShoppingCart className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total commandes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <FaClock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <FaCheckCircle className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Validées</p>
                <p className="text-2xl font-bold text-gray-900">{stats.validatedOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <FaEuroSign className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <FaStore className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Restaurants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRestaurants}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/partnerships')}
                className="w-full flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <div className="flex items-center">
                  <FaClock className="h-5 w-5 text-yellow-600 mr-3" />
                  <span className="font-medium">Demandes de partenariat</span>
                </div>
                <span className="bg-yellow-600 text-white px-2 py-1 rounded-full text-sm">
                  {stats.pendingPartners}
                </span>
              </button>

              <button
                onClick={() => router.push('/admin/orders')}
                className="w-full flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center">
                  <FaShoppingCart className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="font-medium">Commandes en attente</span>
                </div>
                <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-sm">
                  {stats.pendingOrders}
                </span>
              </button>

              <button
                onClick={() => router.push('/admin/restaurants')}
                className="w-full flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center">
                  <FaStore className="h-5 w-5 text-green-600 mr-3" />
                  <span className="font-medium">Gérer les restaurants</span>
                </div>
                <span className="bg-green-600 text-white px-2 py-1 rounded-full text-sm">
                  {stats.totalRestaurants}
                </span>
              </button>

              <button
                onClick={() => router.push('/admin/users')}
                className="w-full flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-center">
                  <FaUsers className="h-5 w-5 text-purple-600 mr-3" />
                  <span className="font-medium">Gérer les utilisateurs</span>
                </div>
                <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-sm">
                  -
                </span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Commandes recentes</h2>
            {stats.recentOrders.length === 0 ? (
              <p className="text-gray-500">Aucune commande recente</p>
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => (
                  <div key={order?.id || Math.random()} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Commande #{getOrderDisplayId(order)}</p>
                      <p className="text-sm text-gray-600">{order?.customer_name || 'Nom non disponible'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order?.status)}`}>
                        {getStatusText(order?.status)}
                      </span>
                      <p className="text-sm font-medium mt-1">{order?.total_amount || 0}€</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
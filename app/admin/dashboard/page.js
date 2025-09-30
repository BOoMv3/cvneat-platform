'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  FaUsers, 
  FaStore, 
  FaShoppingCart, 
  FaEuroSign,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaPlus,
  FaTimes
} from 'react-icons/fa';

export default function AdminDashboard() {
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
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [newOrder, setNewOrder] = useState({
    restaurant_id: '',
    customer_name: '',
    customer_phone: '',
    delivery_address: '',
    delivery_city: '',
    delivery_postal_code: '',
    delivery_instructions: '',
    total_amount: 0,
    delivery_fee: 3.00,
    items: []
  });
  const router = useRouter();

  useEffect(() => {
    fetchDashboardStats();
    fetchRestaurants();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Recuperer toutes les commandes
      const { data: orders, error: ordersError } = await supabase
        .from('commandes')
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
      const pendingOrders = orders?.filter(o => o.statut === 'en_attente').length || 0;
      const validatedOrders = orders?.filter(o => ['acceptee', 'en_preparation', 'pret_a_livrer', 'livree'].includes(o.statut)).length || 0;
      const totalRevenue = orders?.filter(o => ['acceptee', 'en_preparation', 'pret_a_livrer', 'livree'].includes(o.statut))
        .reduce((sum, order) => sum + (order.total || 0), 0) || 0;
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

  // Charger les restaurants pour le formulaire
  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, nom, adresse')
        .order('nom');
      
      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des restaurants:', error);
    }
  };

  // Créer une commande de test
  const createTestOrder = async () => {
    try {
      const orderData = {
        ...newOrder,
        status: 'pending',
        items: [
          {
            name: 'Pizza Test',
            price: 15.00,
            quantity: 1,
            category: 'Pizza'
          },
          {
            name: 'Boisson',
            price: 3.00,
            quantity: 1,
            category: 'Boisson'
          }
        ],
        total_amount: 18.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select();

      if (error) throw error;

      alert('✅ Commande créée avec succès ! Les livreurs recevront une alerte.');
      setShowCreateOrderModal(false);
      fetchDashboardStats(); // Recharger les stats
    } catch (error) {
      console.error('Erreur lors de la création de la commande:', error);
      alert('❌ Erreur lors de la création de la commande: ' + error.message);
    }
  };

  // Remplir avec des données de test
  const fillTestData = () => {
    setNewOrder({
      restaurant_id: restaurants[0]?.id || '',
      customer_name: 'Client Test Alerte',
      customer_phone: '0612345678',
      delivery_address: '15 Rue de la Nouvelle Commande',
      delivery_city: 'Ganges',
      delivery_postal_code: '34190',
      delivery_instructions: 'Sonner fort, 3ème étage',
      total_amount: 18.00,
      delivery_fee: 3.00,
      items: []
    });
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
      <div className="max-w-full mx-auto px-4 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 space-y-4 lg:space-y-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tableau de bord administrateur</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={() => setShowCreateOrderModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              <FaPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Créer une commande</span>
              <span className="sm:hidden">Créer</span>
            </button>
            <button
              onClick={() => router.push('/admin/restaurants')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Gérer les restaurants</span>
              <span className="sm:hidden">Restaurants</span>
            </button>
            <button
              onClick={() => router.push('/admin/orders')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Voir toutes les commandes</span>
              <span className="sm:hidden">Commandes</span>
            </button>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
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
                      {order?.security_code && (
                        <div className="mt-1 flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Code:</span>
                          <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {order.security_code}
                          </span>
                        </div>
                      )}
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

      {/* Modal pour créer une commande */}
      {showCreateOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Créer une commande de test</h2>
              <button
                onClick={() => setShowCreateOrderModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant
                </label>
                <select
                  value={newOrder.restaurant_id}
                  onChange={(e) => setNewOrder({...newOrder, restaurant_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un restaurant</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.nom} - {restaurant.adresse}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du client
                </label>
                <input
                  type="text"
                  value={newOrder.customer_name}
                  onChange={(e) => setNewOrder({...newOrder, customer_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Client Test Alerte"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  value={newOrder.customer_phone}
                  onChange={(e) => setNewOrder({...newOrder, customer_phone: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0612345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse de livraison
                </label>
                <input
                  type="text"
                  value={newOrder.delivery_address}
                  onChange={(e) => setNewOrder({...newOrder, delivery_address: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="15 Rue de la Nouvelle Commande"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={newOrder.delivery_city}
                    onChange={(e) => setNewOrder({...newOrder, delivery_city: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ganges"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={newOrder.delivery_postal_code}
                    onChange={(e) => setNewOrder({...newOrder, delivery_postal_code: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="75001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions de livraison
                </label>
                <textarea
                  value={newOrder.delivery_instructions}
                  onChange={(e) => setNewOrder({...newOrder, delivery_instructions: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Sonner fort, 3ème étage"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={fillTestData}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Remplir avec des données de test
                </button>
                <button
                  onClick={createTestOrder}
                  disabled={!newOrder.restaurant_id || !newOrder.customer_name}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Créer la commande
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

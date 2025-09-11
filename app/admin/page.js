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
  FaArrowLeft,
  FaEye,
  FaEdit,
  FaTrash,
  FaLock
} from 'react-icons/fa';

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    validatedOrders: 0,
    totalRevenue: 0,
    totalRestaurants: 0,
    pendingPartners: 0,
    recentOrders: [],
    recentRestaurants: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      
      // Vérifier si l'utilisateur est connecté
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        router.push('/login');
        return;
      }

      // Vérifier le rôle de l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (userError || !userData || userData.role !== 'admin') {
        router.push('/');
        return;
      }

      setUser(currentUser);
      fetchDashboardStats();
      
    } catch (err) {
      console.error('Erreur d\'authentification:', err);
      router.push('/login');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer toutes les commandes
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Récupérer tous les restaurants
      const { data: restaurants, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (restaurantsError) throw restaurantsError;

      // Récupérer les demandes de partenariat
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

      // Fallback avec données de test si la base est vide
      const recentOrders = (orders?.length > 0 ? orders : [
        { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', user_id: '11111111-1111-1111-1111-111111111111', restaurant_id: '11111111-1111-1111-1111-111111111111', total_amount: 25.50, status: 'pending', created_at: new Date().toISOString() },
        { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', user_id: '22222222-2222-2222-2222-222222222222', restaurant_id: '22222222-2222-2222-2222-222222222222', total_amount: 18.90, status: 'accepted', created_at: new Date(Date.now() - 3600000).toISOString() },
      ])?.slice(0, 5) || [];

      const recentRestaurants = (restaurants?.length > 0 ? restaurants : [
        { id: '11111111-1111-1111-1111-111111111111', nom: 'La Bella Pizza', adresse: '123 Rue de la Paix', ville: 'Paris', status: 'active', created_at: new Date().toISOString() },
        { id: '22222222-2222-2222-2222-222222222222', nom: 'Burger King', adresse: '456 Avenue des Champs', ville: 'Lyon', status: 'active', created_at: new Date(Date.now() - 7200000).toISOString() },
      ])?.slice(0, 5) || [];

      setStats({
        totalOrders,
        pendingOrders,
        validatedOrders,
        totalRevenue,
        totalRestaurants,
        pendingPartners,
        recentOrders: recentOrders,
        recentRestaurants: recentRestaurants
      });

    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
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
      case 'accepted': return 'Acceptée';
      case 'rejected': return 'Refusée';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prête';
      case 'delivered': return 'Livrée';
      default: return status;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Date invalide';
    }
  };

  const getOrderDisplayId = (order) => {
    if (!order || !order.id) return 'ID manquant';
    try {
      // Si c'est un UUID, on prend les 8 premiers caractères
      if (typeof order.id === 'string' && order.id.length > 8) {
        return order.id.slice(0, 8);
      }
      // Sinon on affiche l'ID complet s'il est court
      return order.id.toString();
    } catch (err) {
      return 'ID invalide';
    }
  };

  const getRestaurantName = (order, allRestaurants) => {
    if (!order) return 'Aucune commande';
    
    // Chercher le restaurant correspondant
    const restaurant = allRestaurants?.find(r => r.id === order.restaurant_id);
    if (restaurant?.nom) {
      return restaurant.nom;
    }
    return 'Restaurant inconnu';
  };

  const getRestaurantAddress = (order, allRestaurants) => {
    if (!order) return 'Commande invalide';
    
    // Chercher le restaurant correspondant
    const restaurant = allRestaurants?.find(r => r.id === order.restaurant_id);
    if (restaurant?.adresse) {
      return restaurant.adresse;
    }
    if (restaurant?.ville) {
      return restaurant.ville;
    }
    return 'Adresse non renseignée';
  };

  const getRestaurantDisplayName = (restaurant) => {
    if (restaurant?.nom) {
      return restaurant.nom;
    }
    return 'Nom non renseigné';
  };

  const getRestaurantDisplayAddress = (restaurant) => {
    if (restaurant?.adresse) {
      return restaurant.adresse;
    }
    if (restaurant?.ville) {
      return restaurant.ville;
    }
    return 'Adresse non renseignée';
  };

  const getOrderInfo = (order, allRestaurants) => {
    if (!order) return { id: 'Commande invalide', restaurant: 'Aucune commande', address: 'Aucune adresse' };
    
    return {
      id: getOrderDisplayId(order),
      restaurant: getRestaurantName(order, allRestaurants),
      address: getRestaurantAddress(order, allRestaurants),
      amount: order.total_amount || 0,
      status: order.status || 'unknown',
      date: order.created_at
    };
  };

  const getRestaurantInfo = (restaurant) => {
    if (!restaurant) return { name: 'Aucun restaurant', address: 'Aucune adresse', status: 'Inconnu' };
    
    return {
      name: getRestaurantDisplayName(restaurant),
      address: getRestaurantDisplayAddress(restaurant),
      status: restaurant.status === 'active' ? 'Actif' : 'Inactif',
      date: restaurant.created_at
    };
  };

  // Affichage de chargement d'authentification
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaLock className="text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Vérification des droits d'accès...</p>
        </div>
      </div>
    );
  }

  // Affichage de chargement des données
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du dashboard admin...</p>
        </div>
      </div>
    );
  }

  // Affichage d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-bold mb-4">Erreur: {error}</p>
          <button
            onClick={fetchDashboardStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 py-4 sm:py-8">
        {/* Header avec bouton retour et info utilisateur */}
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">🚀 Dashboard Administrateur CVN'EAT</h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="text-xs sm:text-sm text-gray-600">
                Connecté en tant qu'admin
              </span>
              <button
                onClick={() => router.push('/')}
                className="flex items-center px-3 sm:px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-xs sm:text-sm"
              >
                <FaArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Retour à l'Accueil</span>
                <span className="sm:hidden">Retour</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-blue-100 text-blue-600">
                <FaUsers className="text-lg sm:text-2xl" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Utilisateurs</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalOrders > 0 ? 'N/A' : '0'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-green-100 text-green-600">
                <FaStore className="text-lg sm:text-2xl" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Restaurants</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalRestaurants}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-purple-100 text-purple-600">
                <FaShoppingCart className="text-lg sm:text-2xl" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Commandes</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-yellow-100 text-yellow-600">
                <FaEuroSign className="text-lg sm:text-2xl" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Chiffre d'Affaires</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* DEBUG: Affichage des données brutes */}
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8">
          <h3 className="font-bold">DEBUG - Données récupérées :</h3>
          <p>Commandes récentes: {stats.recentOrders.length}</p>
          <p>Restaurants récents: {stats.recentRestaurants.length}</p>
          <p>Première commande: {JSON.stringify(stats.recentOrders[0])}</p>
          <p>Premier restaurant: {JSON.stringify(stats.recentRestaurants[0])}</p>
        </div>

        {/* Statistiques détaillées */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Commandes */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Statistiques des Commandes</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Commandes en attente</span>
                  <span className="font-semibold text-yellow-600">{stats.pendingOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Commandes validées</span>
                  <span className="font-semibold text-green-600">{stats.validatedOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Demandes partenariat</span>
                  <span className="font-semibold text-blue-600">{stats.pendingPartners}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Actions Rapides</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => router.push('/admin/users')}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
                >
                  👥 Gérer les Utilisateurs
                </button>
                <button 
                  onClick={() => router.push('/admin/partnerships')}
                  className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left"
                >
                  🤝 Valider les Partenaires
                </button>
                <button 
                  onClick={() => router.push('/admin/restaurants')}
                  className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-left"
                >
                  🏪 Gérer les Restaurants
                </button>
                <button 
                  onClick={() => router.push('/admin/orders')}
                  className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-left"
                >
                  📋 Voir toutes les Commandes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Commandes récentes */}
        <div className="bg-white rounded-lg shadow mb-6 sm:mb-8">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Commandes Récentes</h2>
            {stats.recentOrders.length === 0 && (
              <p className="text-xs sm:text-sm text-gray-500 mt-2">Aucune commande trouvée dans la base de données</p>
            )}
          </div>
          {stats.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commande
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Restaurant
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentOrders.map((order) => {
                    // Chercher le restaurant directement
                    const restaurant = stats.recentRestaurants?.find(r => r.id === order.restaurant_id);
                    
                    return (
                      <tr key={order?.id || Math.random()} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                          #{getOrderDisplayId(order)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {restaurant?.nom || 'Restaurant inconnu'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {formatPrice(order.total_amount)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 sm:p-6 text-center text-gray-500">
              <p className="text-sm">Aucune commande disponible</p>
            </div>
          )}
        </div>

        {/* Restaurants récents */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Restaurants Récents</h2>
            {stats.recentRestaurants.length === 0 && (
              <p className="text-xs sm:text-sm text-gray-500 mt-2">Aucun restaurant trouvé dans la base de données</p>
            )}
          </div>
          {stats.recentRestaurants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adresse
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date création
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentRestaurants.map((restaurant) => {
                    return (
                      <tr key={restaurant?.id || Math.random()} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                          {restaurant?.nom || 'Nom non renseigné'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {restaurant?.adresse || restaurant?.ville || 'Adresse non renseignée'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            restaurant?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {restaurant?.status === 'active' ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {formatDate(restaurant?.created_at)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                          <div className="flex space-x-1 sm:space-x-2">
                            <button className="text-blue-600 hover:text-blue-900 p-1">
                              <FaEye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900 p-1">
                              <FaEdit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900 p-1">
                              <FaTrash className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 sm:p-6 text-center text-gray-500">
              <p className="text-sm">Aucun restaurant disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
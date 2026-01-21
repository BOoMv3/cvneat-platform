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
  FaLock,
  FaRedo,
  FaUser,
  FaUserPlus,
  FaSignInAlt,
  FaEnvelope,
  FaGift,
  FaTruck
} from 'react-icons/fa';

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    validatedOrders: 0,
    totalRevenue: 0, // CA total (articles + livraison)
    cvneatRevenue: 0, // CA CVN'EAT (20%)
    cvneatDeliveryRevenue: 0, // Commission CVN'EAT sur la livraison
    livreurRevenue: 0, // CA Livreur (frais de livraison)
    restaurantRevenue: 0, // Part restaurant (articles - commission)
    totalRestaurants: 0,
    pendingPartners: 0,
    totalUsers: 0,
    recentOrders: [],
    recentRestaurants: [],
    allRestaurants: [],
    totalVisitors: 0,
    registeredVisitors: 0,
    guestVisitors: 0,
    monthlyRevenue: [] // CA CVN'EAT par mois
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [broadcastPrepLoading, setBroadcastPrepLoading] = useState(false);
  const [broadcastPrepResult, setBroadcastPrepResult] = useState(null);
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
        // Rediriger vers login au lieu de la page d'accueil pour éviter la maintenance
        router.push('/login');
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

      // Récupérer toutes les commandes PAYÉES uniquement
      const { data: orders, error: ordersError } = await supabase
        .from('commandes')
        .select('*')
        .eq('payment_status', 'paid') // IMPORTANT: Seulement les commandes payées
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

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

      // Récupérer le total d'utilisateurs
      const { count: totalUsers, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usersError) {
        console.error('Erreur récupération utilisateurs:', usersError);
      }

      // Calculer les statistiques
      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.statut === 'en_attente').length || 0;
      const validatedOrders = orders?.filter(o => ['acceptee', 'en_preparation', 'pret_a_livrer', 'livree'].includes(o.statut)).length || 0;
      
      // Calculer les différents chiffres d'affaires
      const COMMISSION_RATE = 0.20; // 20% de commission sur les commandes
      
      // CA total = montant total des commandes livrées (articles + frais de livraison)
      // CA CVN'EAT = commission (20% du montant des articles) + frais de plateforme (0,49€ par commande)
      // CA Livreur = somme des frais de livraison
      
      let totalRevenue = 0; // CA total
      let cvneatRevenue = 0; // CA CVN'EAT (20%)
      let cvneatDeliveryRevenue = 0; // Commission CVN'EAT sur livraison
      let livreurRevenue = 0; // CA Livreur
      let restaurantRevenue = 0; // CA Restaurant (total - commission)
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      // Calculer le CA mensuel
      const monthlyRevenueMap = new Map(); // Map<"YYYY-MM", amount>
      
      orders?.filter(o => o.statut === 'livree').forEach(order => {
        const orderAmount = parseFloat(order.total || 0); // Montant des articles uniquement
        const deliveryFee = parseFloat(order.frais_livraison || 0); // Frais de livraison
        
        // Trouver le restaurant associé à la commande
        const orderRestaurant = restaurants?.find(r => r.id === order.restaurant_id);
        const normalizedRestaurantName = (orderRestaurant?.nom || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const isInternalRestaurant = normalizedRestaurantName.includes('la bonne pate');
        
        // Utiliser le commission_rate du restaurant (comme dans payments)
        const restaurantCommissionRate = orderRestaurant?.commission_rate 
          ? parseFloat(orderRestaurant.commission_rate) / 100 
          : 0.20; // 20% par défaut
        const commissionRate = isInternalRestaurant ? 0 : restaurantCommissionRate;
        
        const restaurantShare = orderAmount - (orderAmount * commissionRate);
        const cvneatCommission = orderAmount * commissionRate;
        const PLATFORM_FEE = 0.49; // Frais de plateforme fixe par commande
        const cvneatTotalRevenue = cvneatCommission + PLATFORM_FEE; // Commission + frais plateforme

        // CA total = articles + frais de livraison
        totalRevenue += orderAmount + deliveryFee;
        
        // Commission CVN'EAT sur la livraison (10% de la partie > 2.50€)
        const deliveryCommission = parseFloat(order.delivery_commission_cvneat || 0);
        cvneatDeliveryRevenue += deliveryCommission;

        // CA CVN'EAT = commission des articles + frais de plateforme + commission livraison
        cvneatRevenue += cvneatTotalRevenue + deliveryCommission;
        
        // Gains Livreur (net) = frais de livraison - commission CVN'EAT
        const livreurEarning = deliveryFee - deliveryCommission;
        livreurRevenue += livreurEarning;

        // CA Restaurant = articles - commission
        restaurantRevenue += restaurantShare;

        // Calculer le mois de la commande pour le CA mensuel
        // Inclure la commission sur livraison dans le CA mensuel
        const orderDate = new Date(order.created_at);
        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        const currentMonthAmount = monthlyRevenueMap.get(monthKey) || 0;
        // Réutiliser deliveryCommission défini plus haut
        monthlyRevenueMap.set(monthKey, currentMonthAmount + cvneatTotalRevenue + deliveryCommission);
      });

      // Convertir la map en tableau trié (du plus récent au plus ancien)
      const monthlyRevenue = Array.from(monthlyRevenueMap.entries())
        .map(([month, amount]) => ({
          month,
          amount: Math.round(amount * 100) / 100,
          label: new Date(month + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
        }))
        .sort((a, b) => b.month.localeCompare(a.month)); // Trier du plus récent au plus ancien
      
      const totalRestaurants = restaurants?.length || 0;
      const pendingPartners = partnershipRequests?.filter(r => r.status === 'pending').length || 0;

      // Fallback avec données de test si la base est vide
      const recentOrders = (orders || []).slice(0, 5);

      const recentRestaurants = (restaurants || []).slice(0, 5);

      // Statistiques visiteurs
      let totalVisitors = totalUsers || 0;
      let guestVisitors = 0;
      let registeredVisitors = totalUsers || 0;

      try {
        const { data: visitData, error: visitError } = await supabase
          .from('site_visits')
          .select('id, user_id')
          .order('created_at', { ascending: false });

        if (visitError) {
          throw visitError;
        }

        const visits = Array.isArray(visitData) ? visitData : [];
        const totalVisitCount = visits.length;
        const guestVisitCount = visits.filter(visit => !visit.user_id).length;
        const registeredVisitCount = totalVisitCount - guestVisitCount;

        if (totalVisitCount > 0) {
          totalVisitors = totalVisitCount;
          guestVisitors = guestVisitCount;
          registeredVisitors = registeredVisitCount;
        }
      } catch (visitErr) {
        console.warn('⚠️ Impossible de récupérer les visites (table site_visits manquante ?):', visitErr.message || visitErr);
      }

      setStats({
        totalOrders,
        pendingOrders,
        validatedOrders,
        totalRevenue,
        cvneatRevenue,
        cvneatDeliveryRevenue,
        livreurRevenue,
        restaurantRevenue,
        totalRestaurants,
        pendingPartners,
        totalUsers: totalUsers || 0,
        recentOrders: recentOrders,
        recentRestaurants: recentRestaurants,
        allRestaurants: restaurants || [],
        totalVisitors,
        registeredVisitors,
        guestVisitors,
        monthlyRevenue
      });

    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const broadcastPrepTimeToOpenRestaurants = async () => {
    try {
      setBroadcastPrepLoading(true);
      setBroadcastPrepResult(null);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setBroadcastPrepResult({ error: 'Session expirée. Reconnecte-toi.' });
        return;
      }

      const res = await fetch('/api/admin/restaurants/broadcast-prep-time', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setBroadcastPrepResult({ error: data?.error || 'Erreur lors du broadcast' });
        return;
      }

      setBroadcastPrepResult(data);
    } catch (e) {
      setBroadcastPrepResult({ error: e?.message || 'Erreur lors du broadcast' });
    } finally {
      setBroadcastPrepLoading(false);
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
      <div className="max-w-full mx-auto px-2 fold:px-2 xs:px-3 sm:px-4 py-2 fold:py-2 xs:py-3 sm:py-8">
        {/* Header avec bouton retour et info utilisateur - Optimisé mobile et foldable */}
        <div className="mb-3 fold:mb-3 xs:mb-4 sm:mb-6">
          <div className="flex items-center justify-between w-full gap-2 mb-3">
            <h1 className="text-base fold:text-base xs:text-lg sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate flex-1 min-w-0">🚀 Dashboard Admin</h1>
            <button
              onClick={() => router.push('/')}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors text-sm sm:text-base flex-shrink-0 px-2 py-1"
            >
              <FaArrowLeft className="mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Retour</span>
            </button>
          </div>
          
          {/* Boutons d'action - Scroll horizontal sur mobile */}
          <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
            <div className="flex gap-2 sm:gap-3 min-w-max pb-2">
              <button
                onClick={broadcastPrepTimeToOpenRestaurants}
                className="flex items-center justify-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs sm:text-sm font-medium min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0 disabled:opacity-50"
                title="Demander en direct le temps de préparation aux restaurants ouverts"
                disabled={broadcastPrepLoading}
              >
                {broadcastPrepLoading ? (
                  <FaSpinner className="animate-spin h-4 w-4 sm:mr-2" />
                ) : (
                  <FaClock className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Demander temps</span>
              </button>
              <button
                onClick={() => router.push('/admin/reset')}
                className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0"
                title="Réinitialiser"
              >
                <FaRedo className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>
              <button
                onClick={() => router.push('/admin/ads')}
                className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0"
                title="Publicités"
              >
                <FaEye className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Publicités</span>
              </button>
              <button
                onClick={() => router.push('/admin/payments')}
                className="flex items-center justify-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm font-medium min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0"
                title="Paiements"
              >
                <FaEuroSign className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Paiements</span>
              </button>
              <button
                onClick={() => router.push('/admin/newsletter')}
                className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0"
                title="Newsletter"
              >
                <FaEnvelope className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Newsletter</span>
              </button>
              <button
                onClick={() => router.push('/admin/delivery-leaderboard')}
                className="flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs sm:text-sm font-medium min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0"
                title="Classement livreurs"
              >
                <FaTruck className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">Livreurs</span>
              </button>
              <button
                onClick={() => router.push('/admin/create-order')}
                className="flex items-center justify-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs sm:text-sm font-medium min-h-[44px] min-w-[44px] touch-manipulation flex-shrink-0"
                title="Créer une commande"
              >
                <FaShoppingCart className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Créer commande</span>
              </button>
            </div>
          </div>

          {broadcastPrepResult && (
            <div className="mt-2 text-xs sm:text-sm">
              {broadcastPrepResult.error ? (
                <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  ❌ {broadcastPrepResult.error}
                </div>
              ) : (
                <div className="text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  ✅ Demande envoyée — Restaurants ouverts ciblés: <strong>{broadcastPrepResult.targeted ?? 0}</strong> • Notifs créées: <strong>{broadcastPrepResult.inserted ?? 0}</strong> • Popups envoyées en direct: <strong>{broadcastPrepResult.broadcasted ?? 0}</strong>
                  {broadcastPrepResult.insertError?.code ? (
                    <div className="mt-1 text-[11px] sm:text-xs text-orange-700">
                      ⚠️ Insert notifications impossible: {broadcastPrepResult.insertError.code} — {broadcastPrepResult.insertError.message}
                      <span className="ml-1">(il faut appliquer la migration `20260121000003_create_notifications_table.sql`)</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
          
          <div className="text-xs sm:text-sm text-gray-600 mt-2">
            Connecté en tant qu'admin
          </div>
        </div>

        {/* Statistiques principales - Optimisées mobile et foldable */}
        <div className="grid grid-cols-1 fold:grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 fold:gap-2 xs:gap-2 sm:gap-4 mb-3 fold:mb-3 xs:mb-4 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-3 sm:p-6">
            <div className="flex items-center">
              <div className="p-1.5 fold:p-1.5 xs:p-2 sm:p-3 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">
                <FaUsers className="text-sm fold:text-sm xs:text-base sm:text-2xl" />
              </div>
              <div className="ml-2 fold:ml-2 xs:ml-2 sm:ml-4 min-w-0 flex-1">
                <p className="text-[10px] fold:text-[10px] xs:text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 truncate">Total Utilisateurs</p>
                <p className="text-xs fold:text-xs xs:text-sm sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-3 sm:p-6">
            <div className="flex items-center">
              <div className="p-1.5 fold:p-1.5 xs:p-2 sm:p-3 rounded-full bg-green-100 text-green-600 flex-shrink-0">
                <FaStore className="text-sm fold:text-sm xs:text-base sm:text-2xl" />
              </div>
              <div className="ml-2 fold:ml-2 xs:ml-2 sm:ml-4 min-w-0 flex-1">
                <p className="text-[10px] fold:text-[10px] xs:text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 truncate">Restaurants</p>
                <p className="text-xs fold:text-xs xs:text-sm sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRestaurants}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-3 sm:p-6">
            <div className="flex items-center">
              <div className="p-1.5 fold:p-1.5 xs:p-2 sm:p-3 rounded-full bg-purple-100 text-purple-600 flex-shrink-0">
                <FaShoppingCart className="text-sm fold:text-sm xs:text-base sm:text-2xl" />
              </div>
              <div className="ml-2 fold:ml-2 xs:ml-2 sm:ml-4 min-w-0 flex-1">
                <p className="text-[10px] fold:text-[10px] xs:text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 truncate">Total Commandes</p>
                <p className="text-xs fold:text-xs xs:text-sm sm:text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-3 sm:p-6">
            <div className="flex items-center">
              <div className="p-1.5 fold:p-1.5 xs:p-2 sm:p-3 rounded-full bg-yellow-100 text-yellow-600 flex-shrink-0">
                <FaEuroSign className="text-sm fold:text-sm xs:text-base sm:text-2xl" />
              </div>
              <div className="ml-2 fold:ml-2 xs:ml-2 sm:ml-4 min-w-0 flex-1">
                <p className="text-[10px] fold:text-[10px] xs:text-xs sm:text-sm font-medium text-gray-600 truncate">CA Total</p>
                <p className="text-xs fold:text-xs xs:text-sm sm:text-2xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</p>
                <p className="text-[9px] fold:text-[9px] xs:text-xs text-gray-500 mt-0.5 fold:mt-0.5 xs:mt-1 hidden fold:hidden xs:block">(Articles + Livraison)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques visiteurs */}
        <div className="grid grid-cols-1 fold:grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-2 fold:gap-2 xs:gap-3 sm:gap-4 mb-3 fold:mb-3 xs:mb-4 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-3 sm:p-6">
            <div className="flex items-center">
              <div className="p-1.5 fold:p-1.5 xs:p-2 sm:p-3 rounded-full bg-indigo-100 text-indigo-600 flex-shrink-0">
                <FaUser className="text-sm fold:text-sm xs:text-base sm:text-2xl" />
              </div>
              <div className="ml-2 fold:ml-2 xs:ml-2 sm:ml-4 min-w-0 flex-1">
                <p className="text-[10px] fold:text-[10px] xs:text-xs sm:text-sm font-medium text-gray-600 truncate">Visiteurs totaux</p>
                <p className="text-xs fold:text-xs xs:text-sm sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalVisitors || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-3 sm:p-6">
            <div className="flex items-center">
              <div className="p-1.5 fold:p-1.5 xs:p-2 sm:p-3 rounded-full bg-green-100 text-green-600 flex-shrink-0">
                <FaUserPlus className="text-sm fold:text-sm xs:text-base sm:text-2xl" />
              </div>
              <div className="ml-2 fold:ml-2 xs:ml-2 sm:ml-4 min-w-0 flex-1">
                <p className="text-[10px] fold:text-[10px] xs:text-xs sm:text-sm font-medium text-gray-600 truncate">Visiteurs avec compte</p>
                <p className="text-xs fold:text-xs xs:text-sm sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.registeredVisitors || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-3 sm:p-6">
            <div className="flex items-center">
              <div className="p-1.5 fold:p-1.5 xs:p-2 sm:p-3 rounded-full bg-red-100 text-red-600 flex-shrink-0">
                <FaSignInAlt className="text-sm fold:text-sm xs:text-base sm:text-2xl" />
              </div>
              <div className="ml-2 fold:ml-2 xs:ml-2 sm:ml-4 min-w-0 flex-1">
                <p className="text-[10px] fold:text-[10px] xs:text-xs sm:text-sm font-medium text-gray-600 truncate">Visiteurs invités</p>
                <p className="text-xs fold:text-xs xs:text-sm sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.guestVisitors || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chiffres d'affaires détaillés */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 fold:gap-2 xs:gap-4 sm:gap-6 mb-4 fold:mb-4 xs:mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <FaEuroSign className="text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">CA Restaurants</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.restaurantRevenue)}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">Part reversée aux restaurants (80% des articles)</p>
          </div>

          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <FaEuroSign className="text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">CA CVN'EAT (brut)</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.cvneatRevenue)}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Commission articles + frais plateforme + commission livraison
              {stats.cvneatDeliveryRevenue ? ` (livraison: ${formatPrice(stats.cvneatDeliveryRevenue)})` : ''}
            </p>
          </div>


          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <FaEuroSign className="text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">CA Livreur</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.livreurRevenue)}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">Gains livreur (net) = frais livraison - commission CVN'EAT</p>
          </div>
          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-4 sm:p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <FaEuroSign className="text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">CA Complet</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.restaurantRevenue + stats.cvneatRevenue + stats.livreurRevenue)}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">Total restaurants + CVN'EAT (20%) + frais de livraison</p>
          </div>
        </div>

        {/* CA CVN'EAT par mois */}
        <div className="bg-white rounded-lg shadow mb-4 fold:mb-4 xs:mb-6 sm:mb-8">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">CA CVN'EAT par mois</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Chiffre d'affaires CVN'EAT (commissions) par mois</p>
          </div>
          <div className="p-4 sm:p-6">
            {stats.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Mois</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">CA CVN'EAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.monthlyRevenue.map((item, index) => (
                      <tr key={item.month} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-3 px-4 text-sm text-gray-900 capitalize">{item.label}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">{formatPrice(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300">
                    <tr>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900">Total</td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900 text-right">
                        {formatPrice(stats.monthlyRevenue.reduce((sum, item) => sum + item.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible</p>
            )}
          </div>
        </div>

        {/* Statistiques détaillées - Optimisées mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
          {/* Commandes */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Statistiques des Commandes</h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-600">Commandes en attente</span>
                  <span className="font-semibold text-yellow-600 text-sm sm:text-base">{stats.pendingOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-600">Commandes validées</span>
                  <span className="font-semibold text-green-600 text-sm sm:text-base">{stats.validatedOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base text-gray-600">Demandes partenariat</span>
                  <span className="font-semibold text-blue-600 text-sm sm:text-base">{stats.pendingPartners}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Actions Rapides</h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                <button 
                  onClick={() => router.push('/admin/users')}
                  className="p-3 sm:p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left text-sm sm:text-base min-h-[48px] touch-manipulation"
                >
                  👥 Gérer les Utilisateurs
                </button>
                <button 
                  onClick={() => router.push('/admin/partnerships')}
                  className="p-3 sm:p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left text-sm sm:text-base min-h-[48px] touch-manipulation"
                >
                  🤝 Valider les Partenaires
                </button>
                <button 
                  onClick={() => router.push('/admin/complaints')}
                  className="p-3 sm:p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-left text-sm sm:text-base min-h-[48px] touch-manipulation"
                >
                  ⚠️ Gérer les Réclamations
                </button>
                <button 
                  onClick={() => router.push('/admin/restaurants')}
                  className="p-3 sm:p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-left text-sm sm:text-base min-h-[48px] touch-manipulation"
                >
                  🏪 Gérer les Restaurants
                </button>
                <button 
                  onClick={() => router.push('/admin/orders')}
                  className="p-3 sm:p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-left text-sm sm:text-base min-h-[48px] touch-manipulation"
                >
                  📋 Voir toutes les Commandes
                </button>
                <button 
                  onClick={() => router.push('/admin/newsletter')}
                  className="p-3 sm:p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left text-sm sm:text-base min-h-[48px] touch-manipulation"
                >
                  📧 Envoyer Newsletter (Email en masse)
                </button>
                <button 
                  onClick={() => router.push('/admin/bugs')}
                  className="p-3 sm:p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-left text-sm sm:text-base min-h-[48px] touch-manipulation"
                >
                  🐛 Signalements de bugs
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
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Commande
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Restaurant
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Montant
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Statut
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell whitespace-nowrap">
                      Date
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentOrders.map((order) => {
                    // Chercher le restaurant dans l'ensemble des restaurants
                    const restaurant = stats.allRestaurants?.find(r => r.id === order.restaurant_id);
                    
                    return (
                      <tr key={order?.id || Math.random()} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                          #{getOrderDisplayId(order)}
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 max-w-[120px] sm:max-w-none truncate sm:whitespace-nowrap">
                          {restaurant?.nom || 'Restaurant inconnu'}
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          {formatPrice(order.total)}
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full ${getStatusColor(order.statut)}`}>
                            {getStatusText(order.statut)}
                          </span>
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                          <button
                            onClick={() => router.push(`/admin/orders/${order.id}`)}
                            className="text-blue-600 hover:text-blue-900 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                            title="Voir les détails"
                          >
                            <FaEye className="h-4 w-4" />
                          </button>
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
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Nom
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Adresse
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Statut
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell whitespace-nowrap">
                      Date création
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentRestaurants.map((restaurant) => {
                    return (
                      <tr key={restaurant?.id || Math.random()} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 max-w-[120px] sm:max-w-none truncate sm:whitespace-nowrap">
                          {restaurant?.nom || 'Nom non renseigné'}
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 max-w-[150px] sm:max-w-none truncate sm:whitespace-nowrap">
                          {restaurant?.adresse || restaurant?.ville || 'Adresse non renseignée'}
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full ${
                            restaurant?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {restaurant?.status === 'active' ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden sm:table-cell">
                          {formatDate(restaurant?.created_at)}
                        </td>
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                          <div className="flex space-x-1 sm:space-x-2">
                            <button
                              onClick={() => router.push(`/admin/restaurants/${restaurant.id}`)}
                              className="text-blue-600 hover:text-blue-900 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                              title="Voir les détails"
                            >
                              <FaEye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/admin/restaurants/${restaurant.id}`)}
                              className="text-green-600 hover:text-green-900 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                              title="Modifier"
                            >
                              <FaEdit className="h-4 w-4" />
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
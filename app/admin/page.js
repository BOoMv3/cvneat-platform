'use client';

import { isAdminViewerRole } from '../../lib/admin-viewer';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAdminAccess } from '../../components/AdminAccessContext';
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
  FaTruck,
  FaComments,
  FaBell,
  FaSearch,
  FaCircle,
  FaMotorcycle,
  FaChevronDown,
  FaChevronUp,
  FaEllipsisH
} from 'react-icons/fa';
import OpenCloseManualNotice from '@/components/OpenCloseManualNotice';
import AdminOnlineBadge from '@/components/AdminOnlineBadge';
import { livreurEarningNetEur } from '../../lib/livreur-delivery-earnings';
import {
  aggregateCvneatRevenue,
  getOrderArticlesSubtotalEur,
  getOrderCommissionRateDecimal,
} from '../../lib/cvneat-order-revenue';
import {
  isWeekHalfOffPromoActive,
  WEEK_HALF_OFF_PROMO_BANNER,
} from '../../lib/week-half-off-promo';

export default function AdminPage() {
  const { readOnly, canWrite } = useAdminAccess();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    validatedOrders: 0,
    totalRevenue: 0, // CA total (articles + livraison)
    cvneatRevenue: 0, // Gain net CVN'EAT (après promos plateforme)
    cvneatGrossRevenue: 0, // Avant déduction promos plateforme
    cvneatPlatformPromoCost: 0,
    cvneatCommissionTotal: 0,
    cvneatPlatformFeesTotal: 0,
    cvneatLoyaltySubsidyTotal: 0,
    cvneatDeliveryRevenue: 0, // Commission CVN'EAT sur la livraison
    livreurRevenue: 0, // CA Livreur (frais de livraison)
    restaurantRevenue: 0, // Part restaurant (articles - commission)
    totalRestaurants: 0,
    pendingPartners: 0,
    totalUsers: 0,
    activeCvneatPlusSubscribers: 0,
    recentOrders: [],
    recentRestaurants: [],
    allRestaurants: [],
    totalVisitors: 0,
    registeredVisitors: 0,
    guestVisitors: 0,
    monthlyRevenue: [] // CA CVN'EAT par mois
  });
  const [syncingPlus, setSyncingPlus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [togglingRestaurantId, setTogglingRestaurantId] = useState(null);
  const [broadcastPrepLoading, setBroadcastPrepLoading] = useState(false);
  const [broadcastPrepResult, setBroadcastPrepResult] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [showRestaurantControl, setShowRestaurantControl] = useState(false);
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

      if (userError || !userData || !isAdminViewerRole(userData.role)) {
        // Rediriger vers login au lieu de la page d'accueil pour éviter la maintenance
        router.push('/login');
        return;
      }

      setUser(currentUser);
      fetchDashboardStats();
      fetchCvneatPlusStats();
      
    } catch (err) {
      console.error('Erreur d\'authentification:', err);
      router.push('/login');
    } finally {
      setAuthLoading(false);
    }
  };

  const toggleRestaurantOpen = async (restaurant, shouldOpen) => {
    if (!canWrite) {
      alert('Lecture seule : modification impossible.');
      return;
    }
    try {
      setTogglingRestaurantId(restaurant.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expirée');

      const payload = {
        ferme_manuellement: !shouldOpen,
        ouvert_manuellement: shouldOpen,
        manual_status_updated_at: new Date().toISOString(),
        manual_status_updated_by: user?.id || null
      };
      const res = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || json?.details || `Erreur HTTP ${res.status}`);
      }
      const updatedRestaurant = json?.restaurant || {};
      const fm = updatedRestaurant?.ferme_manuellement;
      const manualClosed = fm === true || fm === 'true' || fm === 1 || fm === '1';
      const om = updatedRestaurant?.ouvert_manuellement;
      const manualOpen = om === true || om === 'true' || om === 1 || om === '1';

      setStats((prev) => ({
        ...prev,
        allRestaurants: (prev.allRestaurants || []).map((r) =>
          r.id === restaurant.id ? { ...r, ferme_manuellement: manualClosed, ouvert_manuellement: manualOpen } : r
        )
      }));
    } catch (e) {
      console.error('Erreur ouverture/fermeture restaurant (admin):', e);
      alert(e?.message || "Erreur lors de l'ouverture/fermeture du restaurant.");
    } finally {
      setTogglingRestaurantId(null);
    }
  };

  const fetchCvneatPlusStats = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/admin/cvneat-plus', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('CVN\'EAT Plus stats:', json?.error || res.status);
        return;
      }
      setStats((prev) => ({
        ...prev,
        activeCvneatPlusSubscribers: Number(json.activeCount || 0),
      }));
    } catch (e) {
      console.error('CVN\'EAT Plus stats:', e);
    }
  };

  const syncCvneatPlusFromStripe = async () => {
    if (!canWrite) {
      alert('Lecture seule : synchronisation impossible.');
      return;
    }
    try {
      setSyncingPlus(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Session expirée');

      const res = await fetch('/api/admin/cvneat-plus', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Sync impossible');

      setStats((prev) => ({
        ...prev,
        activeCvneatPlusSubscribers: Number(json.activeCount || 0),
      }));
      alert(`CVN'EAT Plus synchronisé : ${json.activeCount || 0} abonné(s) actif(s) (${json.synced || 0} abo Stripe traités).`);
    } catch (e) {
      alert(e?.message || 'Erreur sync CVN\'EAT Plus');
    } finally {
      setSyncingPlus(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Même source que "Gestion des commandes" > Payées : payment_status paid ou succeeded
      const { data: orders, error: ordersError } = await supabase
        .from('commandes')
        .select('*')
        .in('payment_status', ['paid', 'succeeded'])
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
      
      // CA total = montant total des commandes livrées (articles + frais de livraison)
      // Gain CVN'EAT = commission + 0,49€ + commission livraison − promos plateforme − subvention fidélité
      
      let totalRevenue = 0; // CA total
      let livreurRevenue = 0; // CA Livreur
      let restaurantRevenue = 0; // CA Restaurant (total - commission)

      const deliveredOrders = orders?.filter((o) => o.statut === 'livree') || [];
      const { totals: cvneatTotals, monthlyRevenue } = aggregateCvneatRevenue(
        deliveredOrders,
        restaurants || []
      );

      deliveredOrders.forEach((order) => {
        const { orderAmount } = getOrderArticlesSubtotalEur(order);
        const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
        const storedPayout =
          order.restaurant_payout != null ? parseFloat(order.restaurant_payout) : null;
        const orderRestaurant = restaurants?.find((r) => r.id === order.restaurant_id);
        const rate = getOrderCommissionRateDecimal(order, orderRestaurant);
        const restaurantShare =
          storedPayout != null ? storedPayout : Math.round(orderAmount * (1 - rate) * 100) / 100;

        totalRevenue += orderAmount + deliveryFee;
        livreurRevenue += livreurEarningNetEur(order);
        restaurantRevenue += restaurantShare;
      });
      
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

      setStats((prev) => ({
        totalOrders,
        pendingOrders,
        validatedOrders,
        totalRevenue,
        cvneatRevenue: cvneatTotals.net,
        cvneatGrossRevenue: cvneatTotals.gross,
        cvneatPlatformPromoCost: cvneatTotals.platformPromoCost,
        cvneatCommissionTotal: cvneatTotals.commission,
        cvneatPlatformFeesTotal: cvneatTotals.platformFees,
        cvneatLoyaltySubsidyTotal: cvneatTotals.loyaltySubsidy,
        cvneatDeliveredOrders: cvneatTotals.deliveredOrders,
        cvneatOrdersWithEstimatedPromo: cvneatTotals.ordersWithEstimatedPromo,
        cvneatDeliveryRevenue: cvneatTotals.deliveryCommission,
        livreurRevenue,
        restaurantRevenue,
        totalRestaurants,
        pendingPartners,
        totalUsers: totalUsers || 0,
        activeCvneatPlusSubscribers: prev.activeCvneatPlusSubscribers || 0,
        recentOrders: recentOrders,
        recentRestaurants: recentRestaurants,
        allRestaurants: restaurants || [],
        totalVisitors,
        registeredVisitors,
        guestVisitors,
        monthlyRevenue
      }));

    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const broadcastPrepTimeToOpenRestaurants = async () => {
    if (!canWrite) {
      alert('Lecture seule : action impossible.');
      return;
    }
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
      case 'en_attente': return 'En attente';
      case 'acceptee': return 'Acceptée';
      case 'refusee': return 'Refusée';
      case 'en_preparation': return 'En préparation';
      case 'pret_a_livrer': return 'Prête';
      case 'livree': return 'Livrée';
      case 'annulee': return 'Annulée';
      default: return status;
    }
  };

  const canCancelOrder = (order) => {
    if (!order || order.statut === 'annulee') return false;
    const payment = (order.payment_status || '').toString().trim().toLowerCase();
    return !['refunded', 'cancelled'].includes(payment);
  };

  const cancelOrder = async (orderId) => {
    if (!canWrite) {
      alert('Lecture seule : annulation impossible.');
      return;
    }
    if (!window.confirm('Annuler cette commande et rembourser le client si le paiement a été reçu ?')) {
      return;
    }

    try {
      setCancellingOrderId(orderId);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Session expirée');

      const res = await fetch(`/api/admin/orders/cancel/${orderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || json?.details || 'Impossible d\'annuler la commande');
      }

      alert(json?.message || 'Commande annulée.');
      await fetchDashboardStats();
    } catch (e) {
      alert(e?.message || 'Erreur annulation commande');
    } finally {
      setCancellingOrderId(null);
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
            onClick={() => {
              fetchDashboardStats();
              fetchCvneatPlusStats();
            }}
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
      <OpenCloseManualNotice />
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header compact */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Admin</h1>
                <AdminOnlineBadge />
              </div>
              {readOnly && (
                <p className="text-xs text-amber-700 mt-0.5">Lecture seule</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/';
                else router.push('/');
              }}
              className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              Site client
            </button>
          </div>

          {/* Accès prioritaires — grille tactile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
            {[
              { href: '/admin/orders', label: 'Commandes', icon: FaShoppingCart, color: 'bg-orange-500' },
              { href: '/admin/live-delivery', label: 'Live livreurs', icon: FaMotorcycle, color: 'bg-indigo-500' },
              { href: '/admin/payments', label: 'Paiements', icon: FaEuroSign, color: 'bg-purple-500' },
              { href: '/admin/restaurants', label: 'Restaurants', icon: FaStore, color: 'bg-emerald-500' },
              { href: '/admin/customer-search', label: 'Clients', icon: FaSearch, color: 'bg-cyan-500' },
              { href: '/admin/messages', label: 'Messages', icon: FaComments, color: 'bg-blue-500' },
            ].map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className="flex items-center gap-3 rounded-2xl bg-white border border-gray-200 px-3 py-3.5 text-left shadow-sm hover:border-gray-300 min-h-[56px] touch-manipulation"
              >
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-white ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-gray-900">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Plus d'outils */}
          <button
            type="button"
            onClick={() => setShowMoreTools((v) => !v)}
            className="w-full flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 min-h-[48px]"
          >
            <span className="inline-flex items-center gap-2">
              <FaEllipsisH className="text-gray-400" />
              Plus d&apos;outils
            </span>
            {showMoreTools ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
          </button>

          {showMoreTools && (
            <div className="mt-2 rounded-2xl border border-gray-200 bg-white p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
              {[
                { href: '/admin/promo-codes', label: 'Codes promo', icon: FaGift },
                { href: '/admin/newsletter', label: 'Newsletter', icon: FaEnvelope },
                { href: '/admin/delivery-messages', label: 'Chat livreurs', icon: FaTruck },
                { href: '/admin/presence', label: 'Qui est en ligne', icon: FaCircle },
                { href: '/admin/delivery-leaderboard', label: 'Classement livreurs', icon: FaTruck },
                { href: '/admin/delivery-applications', label: 'Candidatures livreurs', icon: FaUserPlus },
                { href: '/admin/users', label: 'Utilisateurs', icon: FaUsers },
                { href: '/admin/partnerships', label: 'Partenaires', icon: FaStore },
                { href: '/admin/complaints', label: 'Réclamations', icon: FaTimesCircle },
                { href: '/admin/ads', label: 'Publicités', icon: FaEye },
                { href: '/admin/bugs', label: 'Bugs signalés', icon: FaLock },
                ...(!readOnly
                  ? [
                      { href: '/admin/create-order', label: 'Créer une commande', icon: FaShoppingCart },
                      { href: '/admin/test-push', label: 'Test push', icon: FaBell },
                      { href: '/admin/reset', label: 'Réinitialiser', icon: FaRedo },
                    ]
                  : []),
              ].map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 min-h-[48px] touch-manipulation"
                >
                  <item.icon className="h-4 w-4 text-gray-500 shrink-0" />
                  {item.label}
                </button>
              ))}
              {!readOnly && (
                <button
                  type="button"
                  onClick={broadcastPrepTimeToOpenRestaurants}
                  disabled={broadcastPrepLoading}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-orange-800 hover:bg-orange-50 min-h-[48px] touch-manipulation disabled:opacity-50 sm:col-span-2"
                >
                  {broadcastPrepLoading ? (
                    <FaSpinner className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <FaClock className="h-4 w-4 shrink-0" />
                  )}
                  Demander temps de prépa aux restos ouverts
                </button>
              )}
            </div>
          )}

          {broadcastPrepResult && (
            <div className="mt-2 text-xs sm:text-sm">
              {broadcastPrepResult.error ? (
                <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {broadcastPrepResult.error}
                </div>
              ) : (
                <div className="text-orange-800 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                  Demande envoyée — ciblés: {broadcastPrepResult.targeted ?? 0} · notifs: {broadcastPrepResult.inserted ?? 0} · popups: {broadcastPrepResult.broadcasted ?? 0}
                </div>
              )}
            </div>
          )}

          {/* Contrôle restos — replié par défaut */}
          <div className="mt-3 rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRestaurantControl((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left min-h-[52px]"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">Ouverture / fermeture restos</p>
                <p className="text-xs text-gray-500">
                  {(stats.allRestaurants || []).filter((r) => r.ferme_manuellement).length} fermé(s) manuellement · {(stats.allRestaurants || []).length} total
                </p>
              </div>
              {showRestaurantControl ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
            </button>
            {showRestaurantControl && (
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border-t border-gray-100">
                {(stats.allRestaurants || []).map((r) => {
                  const isClosed = !!r.ferme_manuellement;
                  return (
                    <div
                      key={r.id}
                      className="px-3 py-2.5 sm:px-4 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {r.nom || 'Restaurant sans nom'}
                        </p>
                        <p className={`text-xs ${isClosed ? 'text-red-600' : 'text-green-600'}`}>
                          {isClosed ? 'Fermé manuellement' : 'Ouvert'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRestaurantOpen(r, isClosed)}
                        disabled={readOnly || togglingRestaurantId === r.id}
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold min-h-[40px] disabled:opacity-40 ${
                          isClosed
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {togglingRestaurantId === r.id ? '…' : isClosed ? 'Ouvrir' : 'Fermer'}
                      </button>
                    </div>
                  );
                })}
                {(stats.allRestaurants || []).length === 0 && (
                  <div className="px-4 py-4 text-sm text-gray-500 text-center">
                    Aucun restaurant trouvé.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* KPI essentiels */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {[
            { label: 'Commandes', value: stats.totalOrders, sub: `${stats.pendingOrders} en attente` },
            { label: 'CA total', value: formatPrice(stats.totalRevenue), sub: 'Articles + livraison' },
            { label: 'Restaurants', value: stats.totalRestaurants, sub: `${stats.pendingPartners} partenaires` },
            { label: 'Utilisateurs', value: stats.totalUsers || 0, sub: `${stats.activeCvneatPlusSubscribers || 0} Plus` },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl bg-white border border-gray-200 p-3 sm:p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5">{kpi.value}</p>
              <p className="text-[11px] text-gray-400 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Ancien contenu stats détaillées — conservé plus bas, allégé */}
        <div className="hidden sm:grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Visiteurs</p>
            <p className="text-xl font-bold text-gray-900">{stats.totalVisitors || 0}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Avec compte</p>
            <p className="text-xl font-bold text-gray-900">{stats.registeredVisitors || 0}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Invités</p>
            <p className="text-xl font-bold text-gray-900">{stats.guestVisitors || 0}</p>
          </div>
        </div>

        </div>

        {isWeekHalfOffPromoActive() && (
          <div className="mb-4 fold:mb-4 xs:mb-6 sm:mb-8 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Promo plateforme en cours</p>
            <p className="mt-1">{WEEK_HALF_OFF_PROMO_BANNER}</p>
            <p className="mt-2 text-xs text-amber-800">
              Les gains CVN&apos;EAT ci-dessous intègrent le coût de cette promo (montant déduit par commande).
            </p>
          </div>
        )}

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

          <div className="bg-white rounded-lg shadow p-2 fold:p-2 xs:p-4 sm:p-6 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <FaEuroSign className="text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Gain net CVN&apos;EAT</p>
                  <p
                    className={`text-2xl font-bold ${
                      stats.cvneatRevenue < 0 ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {formatPrice(stats.cvneatRevenue)}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-600 space-y-1 sm:text-right">
                <p>
                  Avant promos plateforme :{' '}
                  <span className="font-semibold text-gray-900">
                    {formatPrice(stats.cvneatGrossRevenue)}
                  </span>
                </p>
                <p>
                  − Promos plateforme :{' '}
                  <span className="font-semibold text-red-600">
                    {formatPrice(stats.cvneatPlatformPromoCost)}
                  </span>
                </p>
                {stats.cvneatLoyaltySubsidyTotal > 0 && (
                  <p>
                    − Subventions fidélité :{' '}
                    <span className="font-semibold text-red-600">
                      {formatPrice(stats.cvneatLoyaltySubsidyTotal)}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 border-t border-gray-100 pt-3">
              <div>
                <p className="text-gray-500">Commissions articles</p>
                <p className="font-semibold text-gray-900">{formatPrice(stats.cvneatCommissionTotal)}</p>
              </div>
              <div>
                <p className="text-gray-500">Frais plateforme (0,49 €)</p>
                <p className="font-semibold text-gray-900">{formatPrice(stats.cvneatPlatformFeesTotal)}</p>
              </div>
              <div>
                <p className="text-gray-500">Commission livraison</p>
                <p className="font-semibold text-gray-900">{formatPrice(stats.cvneatDeliveryRevenue)}</p>
              </div>
              <div>
                <p className="text-gray-500">Commandes livrées</p>
                <p className="font-semibold text-gray-900">{stats.cvneatDeliveredOrders || 0}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Sans promo : gain ≈ commissions + 0,49 € + livraison. Avec promo (−50 %, etc.) : le coût est
              déduit automatiquement (montant enregistré sur chaque commande).
              {stats.cvneatOrdersWithEstimatedPromo > 0
                ? ` ${stats.cvneatOrdersWithEstimatedPromo} commande(s) estimée(s) (promo non enregistrée en base).`
                : ''}
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

        {/* Gain CVN'EAT par mois */}
        <div className="bg-white rounded-lg shadow mb-4 fold:mb-4 xs:mb-6 sm:mb-8">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Gain net CVN&apos;EAT par mois</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Commissions + frais plateforme + livraison, moins promos plateforme et subventions fidélité
            </p>
          </div>
          <div className="p-4 sm:p-6">
            {stats.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 text-sm font-medium text-gray-700">Mois</th>
                      <th className="text-right py-3 px-3 text-sm font-medium text-gray-700">Avant promos</th>
                      <th className="text-right py-3 px-3 text-sm font-medium text-gray-700">Promos plateforme</th>
                      <th className="text-right py-3 px-3 text-sm font-medium text-gray-700">Gain net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.monthlyRevenue.map((item, index) => (
                      <tr key={item.month} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-3 px-3 text-sm text-gray-900 capitalize">{item.label}</td>
                        <td className="py-3 px-3 text-sm text-gray-700 text-right">{formatPrice(item.gross)}</td>
                        <td className="py-3 px-3 text-sm text-red-600 text-right">
                          −{formatPrice(item.platformPromoCost)}
                        </td>
                        <td
                          className={`py-3 px-3 text-sm font-semibold text-right ${
                            item.net < 0 ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {formatPrice(item.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300">
                    <tr>
                      <td className="py-3 px-3 text-sm font-bold text-gray-900">Total</td>
                      <td className="py-3 px-3 text-sm font-bold text-gray-900 text-right">
                        {formatPrice(stats.monthlyRevenue.reduce((sum, item) => sum + item.gross, 0))}
                      </td>
                      <td className="py-3 px-3 text-sm font-bold text-red-600 text-right">
                        −{formatPrice(stats.monthlyRevenue.reduce((sum, item) => sum + item.platformPromoCost, 0))}
                      </td>
                      <td className="py-3 px-3 text-sm font-bold text-gray-900 text-right">
                        {formatPrice(stats.monthlyRevenue.reduce((sum, item) => sum + item.net, 0))}
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

        {/* Statistiques commandes compactes */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 sm:mb-6">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">État des commandes</h2>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-yellow-600">{stats.pendingOrders}</p>
              <p className="text-[11px] text-gray-500 mt-1">En attente</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-600">{stats.validatedOrders}</p>
              <p className="text-[11px] text-gray-500 mt-1">Validées</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600">{stats.pendingPartners}</p>
              <p className="text-[11px] text-gray-500 mt-1">Partenaires</p>
            </div>
          </div>
        </div>

        {/* Commandes récentes */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 sm:mb-8">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Commandes récentes</h2>
            <button
              type="button"
              onClick={() => router.push('/admin/orders')}
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              Tout voir
            </button>
          </div>
          {stats.recentOrders.length === 0 && (
            <p className="text-sm text-gray-500 p-4">Aucune commande trouvée</p>
          )}
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
                          <div className="flex items-center gap-1">
                            {canWrite && canCancelOrder(order) && (
                              <button
                                onClick={() => cancelOrder(order.id)}
                                disabled={cancellingOrderId === order.id}
                                className="text-orange-600 hover:text-orange-900 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
                                title="Annuler et rembourser"
                              >
                                {cancellingOrderId === order.id ? '...' : 'Annuler'}
                              </button>
                            )}
                            <button
                              onClick={() => router.push(`/admin/orders/${order.id}`)}
                              className="text-blue-600 hover:text-blue-900 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                              title="Voir les détails"
                            >
                              <FaEye className="h-4 w-4" />
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
              <p className="text-sm">Aucune commande disponible</p>
            </div>
          )}
        </div>

        {/* Stratégie Boost - Partenaires intéressés */}
        {(() => {
          const boostPartners = (stats.allRestaurants || []).filter(
            (r) => r?.strategie_boost_acceptee === true || r?.strategie_boost_acceptee === 'true'
          );
          if (boostPartners.length === 0) return null;
          return (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg shadow border border-amber-200 dark:border-amber-700">
              <div className="p-4 sm:p-6 border-b border-amber-200 dark:border-amber-700">
                <h2 className="text-lg sm:text-xl font-semibold text-amber-900 dark:text-amber-100">
                  Stratégie Boost ventes – Partenaires intéressés ({boostPartners.length})
                </h2>
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Ces partenaires ont signalé leur intérêt. Contactez-les ou notez le 07 86 01 41 71 pour les rappels.
                </p>
              </div>
              <div className="p-4 sm:p-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-amber-200 dark:divide-amber-700">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-amber-800 uppercase">Restaurant</th>
                      <th className="text-left text-xs font-medium text-amber-800 uppercase">Téléphone</th>
                      <th className="text-left text-xs font-medium text-amber-800 uppercase">Réduction</th>
                      <th className="text-left text-xs font-medium text-amber-800 uppercase">Date</th>
                      <th className="text-left text-xs font-medium text-amber-800 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 dark:divide-amber-800">
                    {boostPartners.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 text-sm font-medium text-gray-900 dark:text-white">{r.nom || '—'}</td>
                        <td className="py-2 text-sm text-gray-700 dark:text-gray-300">{r.telephone || '—'}</td>
                        <td className="py-2 text-sm text-gray-600 dark:text-gray-400">
                          {r.strategie_boost_reduction_pct != null ? `${r.strategie_boost_reduction_pct}%` : '—'}
                        </td>
                        <td className="py-2 text-sm text-gray-600 dark:text-gray-400">
                          {r.strategie_boost_accepted_at
                            ? new Date(r.strategie_boost_accepted_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td>
                          <button
                            onClick={() => router.push(`/admin/restaurants/${r.id}`)}
                            className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 text-sm font-medium"
                          >
                            Voir / Config
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

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
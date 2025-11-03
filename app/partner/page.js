'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { 
  FaUtensils, 
  FaClock, 
  FaEuroSign, 
  FaBell, 
  FaEdit, 
  FaTrash,
  FaCheck,
  FaTimes,
  FaEye,
  FaChartLine,
  FaCog,
  FaFileAlt,
  FaMapMarkerAlt,
  FaHome
} from 'react-icons/fa';
import RealTimeNotifications from '../components/RealTimeNotifications';

export default function PartnerDashboard() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Ajout de userData
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    recentOrders: []
  });
  const [orders, setOrders] = useState([]);
  const [showOrdersTab, setShowOrdersTab] = useState(false);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuForm, setMenuForm] = useState({
    nom: '',
    description: '',
    prix: '',
    category: '',
    disponible: true,
    image_url: '',
    supplements: [],
    boisson_taille: '',
    prix_taille: ''
  });
  const [editingMenu, setEditingMenu] = useState(null);
  const router = useRouter();

  const [supplementForm, setSupplementForm] = useState({
    nom: '',
    prix: 0
  });

  const [showSupplementModal, setShowSupplementModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Verifier le role
      console.log('🔍 DEBUG PARTNER - Session user ID:', session.user.id);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      console.log('🔍 DEBUG PARTNER - UserData complet:', userData);
      console.log('🔍 DEBUG PARTNER - UserError:', userError);
      console.log('🔍 DEBUG PARTNER - Rôle utilisateur:', userData?.role);
      console.log('🔍 DEBUG PARTNER - Rôle attendu: restaurant');
      console.log('🔍 DEBUG PARTNER - Comparaison:', userData?.role === 'restaurant');
      
      if (userError || !userData || userData.role !== 'restaurant') {
        console.log('❌ ACCÈS REFUSÉ - Redirection vers l\'accueil');
        console.log('Rôle utilisateur:', userData?.role, 'Attendu: restaurant');
        router.push('/');
        return;
      }
      
      console.log('✅ ACCÈS AUTORISÉ - Rôle restaurant confirmé');

      setUser(session.user);
      setUserData(userData); // Stocker userData dans le state

      // Recuperer le restaurant
      const { data: resto, error: restoError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (restoError || !resto) {
        router.push('/profil-partenaire');
        return;
      }

      setRestaurant(resto);
      await fetchDashboardData(resto.id);
      await fetchMenu(resto.id);
      await fetchOrders(resto.id);
      setLoading(false);
      
      // Rafraîchir automatiquement les commandes toutes les 10 secondes
      const ordersInterval = setInterval(() => {
        fetchOrders(resto.id);
      }, 10000); // 10 secondes
      
      // Nettoyer l'intervalle lors du démontage
      return () => {
        clearInterval(ordersInterval);
      };
    };

    const cleanupPromise = fetchData();
    
    // Nettoyer si nécessaire
    return () => {
      cleanupPromise.then(cleanupFn => {
        if (typeof cleanupFn === 'function') {
          cleanupFn();
        }
      }).catch(() => {});
    };
  }, [router]);

  const fetchDashboardData = async (restaurantId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const token = session.access_token;
      const response = await fetch(`/api/partner/dashboard?restaurantId=${restaurantId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur recuperation dashboard:', error);
    }
  };

  const fetchMenu = async (restaurantId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const token = session.access_token;
      const response = await fetch(`/api/partner/menu?restaurantId=${restaurantId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMenu(data);
      }
    } catch (error) {
      console.error('Erreur recuperation menu:', error);
    }
  };

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    if (!menuForm.nom || !menuForm.prix) return;

    try {
      const url = editingMenu ? '/api/partner/menu' : '/api/partner/menu';
      const method = editingMenu ? 'PUT' : 'POST';
      const body = editingMenu 
        ? { id: editingMenu.id, ...menuForm, user_email: userData.email }
        : { restaurant_id: restaurant.id, ...menuForm, user_email: userData.email };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowMenuModal(false);
        setMenuForm({ 
          nom: '', 
          description: '', 
          prix: '', 
          category: '', 
          disponible: true,
          image_url: '',
          supplements: [],
          boisson_taille: '',
          prix_taille: ''
        });
        setEditingMenu(null);
        await fetchMenu(restaurant.id);
      }
    } catch (error) {
      console.error('Erreur sauvegarde menu:', error);
    }
  };

  const handleDeleteMenu = async (menuId) => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce plat ?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const token = session.access_token;
      const response = await fetch(`/api/partner/menu?id=${menuId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchMenu(restaurant.id);
      }
    } catch (error) {
      console.error('Erreur suppression menu:', error);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      console.log('🔄 Mise à jour commande:', { orderId, status });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ Aucune session trouvée');
        return;
      }
      
      const token = session.access_token;
      console.log('🔑 Token présent:', token ? 'Oui' : 'Non');
      
      // Utiliser l'API correcte pour mettre à jour le statut
      const response = await fetch(`/api/restaurants/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      console.log('📤 Réponse API:', response.status, response.statusText);
      
      if (response.ok) {
        const responseData = await response.json().catch(() => null);
        console.log('✅ Commande mise à jour avec succès');
        console.log('📋 Données retournées par l\'API:', JSON.stringify(responseData, null, 2));
        
        // Vérifier le statut retourné par l'API
        if (responseData && responseData.order) {
          console.log('🔍 Statut dans la réponse API:', {
            orderId: responseData.order.id,
            statut: responseData.order.statut,
            ready_for_delivery: responseData.order.ready_for_delivery,
            original_status_sent: status
          });
        }
        
        // Recharger les données de manière sécurisée avec un petit délai pour laisser la base se mettre à jour
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Augmenter le délai à 1 seconde
          await fetchOrders(restaurant?.id);
          if (restaurant?.id) {
            await fetchDashboardData(restaurant.id);
          }
        } catch (refreshError) {
          console.error('⚠️ Erreur lors du rafraîchissement:', refreshError);
          // Ne pas bloquer l'utilisateur, juste loguer l'erreur
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('❌ Erreur API:', errorData);
        alert(`Erreur: ${errorData.error || 'Impossible de mettre à jour la commande'}`);
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour commande:', error);
      alert(`Erreur: ${error.message || 'Impossible de mettre à jour la commande'}`);
    }
  };

  const addSupplement = () => {
    if (supplementForm.nom && supplementForm.prix > 0) {
      setMenuForm(prev => ({
        ...prev,
        supplements: [...prev.supplements, { ...supplementForm, id: Date.now() }]
      }));
      setSupplementForm({ nom: '', prix: 0 });
      setShowSupplementModal(false);
    }
  };

  const removeSupplement = (index) => {
    setMenuForm(prev => ({
      ...prev,
      supplements: prev.supplements.filter((_, i) => i !== index)
    }));
  };

  

  const handleImageUrlUpload = async (imageUrl, menuItemId) => {
    if (imageUrl) {
      try {
        const formData = new FormData();
        formData.append('imageUrl', imageUrl);
        formData.append('menuItemId', menuItemId);
        formData.append('userEmail', userData.email);

        const response = await fetch('/api/partner/upload-image', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const { imageUrl: newImageUrl } = await response.json();
          // Mettre à jour la liste des plats
          setMenu(prev => prev.map(item =>
            item.id === menuItemId ? { ...item, image_url: newImageUrl } : item
          ));
        }
      } catch (error) {
        console.error('Erreur upload URL image:', error);
      }
    }
  };

  const fetchOrders = async (restaurantId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 DEBUG fetchOrders - Session:', session ? 'Présente' : 'Absente');
      if (!session) {
        console.error('❌ Aucune session trouvée');
        return;
      }
      
      const token = session.access_token;
      console.log('🔍 DEBUG fetchOrders - Token:', token ? 'Présent' : 'Absent');
      console.log('🔍 DEBUG fetchOrders - RestaurantId:', restaurantId);
      
      const response = await fetch(`/api/partner/orders?restaurantId=${restaurantId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('❌ Erreur API récupération commandes:', response.status, errorData);
        setOrders([]); // Définir un tableau vide en cas d'erreur
        return;
      }
      
      const data = await response.json();
      // S'assurer que data est un tableau
      if (!Array.isArray(data)) {
        console.warn('⚠️ Données API invalides (pas un tableau):', data);
        setOrders([]);
        setStats({
          todayOrders: 0,
          pendingOrders: 0,
          totalRevenue: 0,
          recentOrders: []
        });
        return;
      }
      
      setOrders(data);
      
      // DEBUG: Afficher les statuts des commandes pour diagnostiquer
      console.log('🔍 DEBUG fetchOrders - Statuts des commandes:', 
        data.map(o => ({ 
          id: o.id?.slice(0, 8), 
          statut: o.statut,
          statut_type: typeof o.statut,
          statut_length: o.statut?.length,
          statut_raw: JSON.stringify(o.statut), // Pour voir les caractères invisibles
          ready_for_delivery: o.ready_for_delivery,
          created_at: o.created_at,
          updated_at: o.updated_at
        }))
      );
      
      // DEBUG: Vérifier spécifiquement les commandes en_preparation
      const prepOrders = data.filter(o => o.statut === 'en_preparation' || (o.statut && o.statut.includes('preparation')));
      if (prepOrders.length > 0) {
        console.log('✅ Commandes trouvées avec statut en_preparation:', prepOrders.map(o => ({
          id: o.id?.slice(0, 8),
          statut: o.statut,
          statut_raw: JSON.stringify(o.statut)
        })));
      }
      
      // DEBUG: Vérifier spécifiquement les commandes qui devraient être en_preparation
      const ordersWithIssues = data.filter(o => 
        o.statut === 'annulee' && o.created_at && new Date(o.created_at).getTime() > Date.now() - 3600000 // Dernière heure
      );
      if (ordersWithIssues.length > 0) {
        console.warn('⚠️ Commandes récemment créées mais marquées comme annulées:', ordersWithIssues.map(o => ({
          id: o.id?.slice(0, 8),
          statut: o.statut,
          created_at: o.created_at
        })));
      }
        
      // Calculer les statistiques seulement si data est un tableau valide
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Filtrer les commandes d'aujourd'hui
      const todayOrders = data.filter(order => {
        if (!order || !order.created_at) return false;
        const orderDate = new Date(order.created_at);
        return orderDate >= todayStart;
      });
      
      const pendingOrders = data.filter(order => 
        order && order.statut === 'en_attente'
      );
      
      // Calculer le chiffre d'affaires - SEULEMENT les commandes livrées (comptabilisées)
      // Logique métier : Le chiffre d'affaires ne compte que les commandes réellement livrées et payées
      const totalRevenue = data.reduce((sum, order) => {
        if (!order) return sum;
        // Compter uniquement les commandes livrées (statut = 'livree')
        // Les commandes en préparation ou en livraison ne sont pas encore comptabilisées
        if (order.statut === 'livree') {
          const amount = parseFloat(order.total || 0) || 0;
          return sum + amount;
        }
        return sum;
      }, 0);
      
      // Calculer le chiffre d'affaires d'aujourd'hui (seulement les livrées)
      const todayRevenue = todayOrders.reduce((sum, order) => {
        if (!order) return sum;
        // Compter uniquement les commandes livrées aujourd'hui
        if (order.statut === 'livree') {
          const amount = parseFloat(order.total || 0) || 0;
          return sum + amount;
        }
        return sum;
      }, 0);
      
      console.log('🔍 DEBUG - Calcul chiffre d\'affaires:', {
        totalOrders: data.length,
        todayOrders: todayOrders.length,
        totalRevenue,
        todayRevenue,
        ordersLivrees: data.filter(o => o && o.statut === 'livree').length,
        ordersEnPreparation: data.filter(o => o && o.statut === 'en_preparation').length,
        ordersEnLivraison: data.filter(o => o && o.statut === 'en_livraison').length,
        ordersAnnulees: data.filter(o => o && o.statut === 'annulee').length
      });
      
      setStats({
        todayOrders: todayOrders.length || 0,
        pendingOrders: pendingOrders.length || 0,
        totalRevenue: todayRevenue || 0,
        recentOrders: Array.isArray(data) ? data.slice(0, 5) : []
      });
    } catch (error) {
      console.error('Erreur récupération commandes:', error);
    }
  };

  const calculateCommission = (totalAmount) => {
    // S'assurer que totalAmount est un nombre valide
    const amount = parseFloat(totalAmount || 0) || 0;
    if (isNaN(amount) || amount < 0) {
      console.warn('⚠️ calculateCommission: totalAmount invalide:', totalAmount);
      return { commission: 0, restaurantRevenue: 0 };
    }
    const commission = amount * 0.20; // 20% pour CVN'EAT
    const restaurantRevenue = amount - commission;
    return { commission, restaurantRevenue };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col space-y-4 py-4 sm:py-4">
            {/* Bouton retour et titre */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 text-white p-3 sm:p-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                title="Retour à l'accueil"
              >
                <FaHome className="h-6 w-6 sm:h-5 sm:w-5" />
                <span className="text-base sm:text-sm font-medium">Accueil</span>
              </button>
              <div>
                <h1 className="text-2xl sm:text-2xl font-bold text-gray-900">Dashboard Partenaire</h1>
                <p className="text-base sm:text-base text-gray-600">{restaurant?.nom}</p>
              </div>
            </div>
            
            {/* Boutons d'action - Responsive mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
              <button
                onClick={() => router.push('/partner/analytics')}
                className="bg-purple-600 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2 rounded-lg hover:bg-purple-700 transition-colors flex flex-col items-center justify-center space-y-1 text-xs sm:text-sm font-medium"
              >
                <FaChartLine className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </button>
              <button
                onClick={() => router.push('/partner/reports')}
                className="bg-green-600 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2 rounded-lg hover:bg-green-700 transition-colors flex flex-col items-center justify-center space-y-1 text-xs sm:text-sm font-medium"
              >
                <FaFileAlt className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Rapports</span>
                <span className="sm:hidden">Rapports</span>
              </button>
              <button
                onClick={() => router.push('/partner/hours')}
                className="bg-orange-600 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2 rounded-lg hover:bg-orange-700 transition-colors flex flex-col items-center justify-center space-y-1 text-xs sm:text-sm font-medium"
              >
                <FaClock className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Horaires</span>
                <span className="sm:hidden">Horaires</span>
              </button>
              <button
                onClick={() => router.push('/partner/settings')}
                className="bg-gray-600 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2 rounded-lg hover:bg-gray-700 transition-colors flex flex-col items-center justify-center space-y-1 text-xs sm:text-sm font-medium"
              >
                <svg className="h-4 w-4 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Paramètres</span>
                <span className="sm:hidden">Config</span>
              </button>
              <button
                onClick={() => router.push('/partner/delivery-zones')}
                className="bg-blue-600 text-white px-2 sm:px-3 lg:px-4 py-2 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors flex flex-col items-center justify-center space-y-1 text-xs sm:text-sm font-medium"
              >
                <FaMapMarkerAlt className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Zones</span>
                <span className="sm:hidden">Zones</span>
              </button>
              <div className="flex justify-center">
                <RealTimeNotifications restaurantId={restaurant?.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 lg:space-x-8 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap rounded-t-lg ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap rounded-t-lg ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              Commandes
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-2 sm:py-3 lg:py-4 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap rounded-t-lg ${
                activeTab === 'menu'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              Menu
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FaUtensils className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Commandes aujourd'hui</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.todayOrders}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FaClock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">En attente</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.pendingOrders}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FaEuroSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Revenus aujourd'hui</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {(stats.totalRevenue || 0).toFixed(2)} €
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Commandes recentes</h2>
              </div>
              <div className="p-6">
                {!Array.isArray(stats?.recentOrders) || stats.recentOrders.length === 0 ? (
                  <p className="text-gray-500 text-center">Aucune commande recente</p>
                ) : (
                  <div className="space-y-4">
                    {stats.recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Commande #{order.id}</p>
                          <p className="text-sm text-gray-600">
                            {(parseFloat(order.total || 0) || 0).toFixed(2)} €
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.statut === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.statut === 'accepted' ? 'bg-blue-100 text-blue-800' :
                            order.statut === 'ready' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.statut}
                          </span>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'accepted')}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FaCheck className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Statistiques des commandes */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FaUtensils className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total commandes</p>
                    <p className="text-2xl font-semibold text-gray-900">{Array.isArray(orders) ? orders.length : 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FaClock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">En attente</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.pendingOrders}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FaEuroSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {(stats.totalRevenue || 0).toFixed(2)} €
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FaEuroSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Vos gains (80%)</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {((stats.totalRevenue || 0) * 0.8).toFixed(2)} €
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Liste des commandes */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Gestion des commandes</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Gérez vos commandes et calculez vos gains (CVN'EAT prélève 20% de commission)
                </p>
              </div>
              <div className="p-6">
                {!Array.isArray(orders) || orders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucune commande pour le moment</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {orders.map((order) => {
                      // Récupérer total (colonne réelle dans la base) avec fallback, puis 0
                      const totalAmount = parseFloat(order.total || 0) || 0;
                      const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
                      const total = totalAmount + deliveryFee;
                      
                      const { commission, restaurantRevenue } = calculateCommission(totalAmount);
                      
                      return (
                        <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gray-50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <h3 className="font-medium text-gray-900 text-lg">Commande #{order.id?.slice(0, 8) || order.id}</h3>
                              <p className="text-sm text-gray-600">
                                {order.created_at ? new Date(order.created_at).toLocaleString('fr-FR') : 'Date non disponible'}
                              </p>
                              <p className="text-sm text-gray-600">
                                Client: {order.users?.nom || order.customer_name || 'N/A'} {order.users?.prenom || ''}
                              </p>
                            </div>
                            <div className="text-right">
                              {totalAmount > 0 ? (
                                <>
                                  <p className="text-lg font-semibold text-gray-900">
                                    {total.toFixed(2)} €
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Commission CVN'EAT: {commission.toFixed(2)} €
                                  </p>
                                  <p className="text-sm font-medium text-green-600">
                                    Votre gain: {restaurantRevenue.toFixed(2)} €
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm text-gray-500">Prix non disponible</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Articles de la commande */}
                          {order.order_items && order.order_items.length > 0 && (
                            <div className="mt-4 p-3 bg-white rounded border">
                              <p className="text-sm font-medium text-gray-700 mb-2">Articles :</p>
                              <div className="space-y-1">
                                {order.order_items.map((item, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      {item.quantity}x {item.nom}
                                    </span>
                                    <span className="text-gray-900">{item.prix} €</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Statut et actions */}
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                  order.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                                  order.statut === 'en_preparation' ? 'bg-blue-100 text-blue-800' :
                                  order.statut === 'en_livraison' ? 'bg-purple-100 text-purple-800' :
                                  order.statut === 'livree' ? 'bg-gray-100 text-gray-800' :
                                  order.statut === 'annulee' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {order.statut === 'en_attente' ? 'En attente' :
                                   order.statut === 'en_preparation' ? 'En préparation' :
                                   order.statut === 'en_livraison' ? 'En livraison' :
                                   order.statut === 'livree' ? 'Livrée' :
                                   order.statut === 'annulee' ? 'Annulée' :
                                   order.statut || 'Inconnu'}
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 justify-end">
                                {order.statut === 'en_attente' && (
                                  <>
                                    <button
                                      onClick={() => updateOrderStatus(order.id, 'acceptee')}
                                      className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                                    >
                                      Accepter
                                    </button>
                                    <button
                                      onClick={() => updateOrderStatus(order.id, 'refusee')}
                                      className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                                    >
                                      Refuser
                                    </button>
                                  </>
                                )}
                                {order.statut === 'en_preparation' && !order.livreur_id && !order.ready_for_delivery && (
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'pret_a_livrer')}
                                    className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                                  >
                                    Marquer comme prête
                                  </button>
                                )}
                                {order.statut === 'en_preparation' && order.ready_for_delivery && !order.livreur_id && (
                                  <span className="text-sm text-green-600 px-3 py-2 font-medium">
                                    ✓ Prête pour livraison
                                  </span>
                                )}
                                {order.statut === 'en_preparation' && order.livreur_id && (
                                  <span className="text-sm text-gray-600 px-3 py-2">
                                    En attente du livreur
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Gestion du menu</h2>
              <button
                onClick={() => setShowMenuModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ajouter un plat
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                {!Array.isArray(menu) || menu.length === 0 ? (
                  <p className="text-gray-500 text-center">Aucun plat dans le menu</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {menu.map((item) => (
                      <div key={item.id} className="border rounded-lg p-2 sm:p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
                        {/* Image du plat */}
                        <div className="mb-2">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.nom}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-500 text-xs">Pas d'image</span>
                            </div>
                          )}
                          
                          {/* Upload d'image */}
                          <div className="mt-1 space-y-1">
                            <div className="flex gap-1">
                              <input
                                id={`menu-item-url-${item.id}`}
                                type="url"
                                placeholder="URL image"
                                className="flex-1 text-xs border border-gray-300 rounded px-1 py-1"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleImageUrlUpload(e.target.value, item.id);
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  const input = document.querySelector(`#menu-item-url-${item.id}`);
                                  if (input && input.value) {
                                    handleImageUrlUpload(input.value, item.id);
                                  }
                                }}
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-medium text-gray-900 text-sm truncate">{item.nom}</h3>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => {
                                setEditingMenu(item);
                                setMenuForm({
                                  ...item,
                                  supplements: item.supplements || [],
                                  boisson_taille: item.boisson_taille || '',
                                  prix_taille: item.prix_taille || ''
                                });
                                setShowMenuModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                            >
                              <FaEdit className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteMenu(item.id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                            >
                              <FaTrash className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-1 line-clamp-2">{item.description}</p>
                        
                        {/* Prix et catégorie */}
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-semibold text-sm text-green-600">{item.prix} €</p>
                          <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded-full">
                            {item.category}
                          </span>
                        </div>
                        
                        {/* Suppléments */}
                        {item.supplements && item.supplements.length > 0 && (
                          <div className="mb-1">
                            <p className="text-xs text-gray-500 mb-1">Suppléments :</p>
                            <div className="flex flex-wrap gap-1">
                              {item.supplements.map((supp, index) => (
                                <span key={index} className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                  {supp.nom} (+{supp.prix}€)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Taille de boisson */}
                        {item.boisson_taille && (
                          <div className="mb-1">
                            <span className="text-xs bg-purple-100 text-purple-800 px-1 py-0.5 rounded">
                              Taille: {item.boisson_taille}
                            </span>
                          </div>
                        )}
                        
                        {/* Statut de disponibilité */}
                        <span className={`inline-block px-1 py-0.5 rounded-full text-xs ${
                          item.disponible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.disponible ? 'Disponible' : 'Indisponible'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingMenu ? 'Modifier le plat' : 'Ajouter un plat'}
            </h3>
            <form onSubmit={handleMenuSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du plat
                  </label>
                  <input
                    type="text"
                    value={menuForm.nom}
                    onChange={(e) => setMenuForm({...menuForm, nom: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={menuForm.prix}
                    onChange={(e) => setMenuForm({...menuForm, prix: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({...menuForm, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categorie
                  </label>
                  <select
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({...menuForm, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selectionner une categorie</option>
                    <option value="entree">Entree</option>
                    <option value="plat">Plat principal</option>
                    <option value="dessert">Dessert</option>
                    <option value="boisson">Boisson</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="disponible"
                    checked={menuForm.disponible}
                    onChange={(e) => setMenuForm({...menuForm, disponible: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="disponible" className="ml-2 block text-sm text-gray-900">
                    Disponible
                  </label>
                </div>
              </div>

              {/* URL de l'image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de l'image du plat
                </label>
                <input
                  type="url"
                  value={menuForm.image_url || ''}
                  onChange={(e) => setMenuForm({...menuForm, image_url: e.target.value})}
                  placeholder="https://exemple.com/image.jpg"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {menuForm.image_url && (
                  <div className="mt-2">
                    <img src={menuForm.image_url} alt="Aperçu" className="w-20 h-20 object-cover rounded-lg" />
                  </div>
                )}
              </div>

              {/* Gestion des suppléments */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Suppléments disponibles
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSupplementModal(true)}
                    className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    + Ajouter
                  </button>
                </div>
                {menuForm.supplements.length > 0 && (
                  <div className="space-y-2">
                    {menuForm.supplements.map((supp, index) => (
                      <div key={supp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm">{supp.nom} - {supp.prix}€</span>
                        <button
                          type="button"
                          onClick={() => removeSupplement(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gestion des tailles de boissons */}
              {menuForm.category === 'boisson' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Taille
                    </label>
                    <input
                      type="text"
                      value={menuForm.boisson_taille}
                      onChange={(e) => setMenuForm({...menuForm, boisson_taille: e.target.value})}
                      placeholder="ex: 33cl, 50cl, 1L"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix pour cette taille (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={menuForm.prix_taille}
                      onChange={(e) => setMenuForm({...menuForm, prix_taille: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingMenu ? 'Modifier' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuModal(false);
                    setMenuForm({ 
                      nom: '', 
                      description: '', 
                      prix: '', 
                      category: '', 
                      disponible: true,
                      image_url: '',
                      supplements: [],
                      boisson_taille: '',
                      prix_taille: ''
                    });
                    setEditingMenu(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pour ajouter un supplément */}
      {showSupplementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md">
            <h4 className="text-lg font-semibold mb-4">Ajouter un supplément</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du supplément
                </label>
                <input
                  type="text"
                  value={supplementForm.nom}
                  onChange={(e) => setSupplementForm({...supplementForm, nom: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: Extra fromage, Bacon, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={supplementForm.prix}
                  onChange={(e) => setSupplementForm({...supplementForm, prix: parseFloat(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={addSupplement}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Ajouter
                </button>
                <button
                  type="button"
                  onClick={() => setShowSupplementModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
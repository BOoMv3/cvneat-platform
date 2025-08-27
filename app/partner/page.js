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
  FaFileAlt
} from 'react-icons/fa';
import RealTimeNotifications from '../components/RealTimeNotifications';

export default function PartnerDashboard() {
  const [user, setUser] = useState(null);
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
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || userData.role !== 'restaurant') {
        console.log('Rôle utilisateur:', userData?.role, 'Attendu: restaurant');
        router.push('/');
        return;
      }

      setUser(session.user);

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
    };

    fetchData();
  }, [router]);

  const fetchDashboardData = async (restaurantId) => {
    try {
      const response = await fetch(`/api/partner/dashboard?restaurantId=${restaurantId}`);
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
      const response = await fetch(`/api/partner/menu?restaurantId=${restaurantId}`);
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
        ? { id: editingMenu.id, ...menuForm }
        : { restaurantId: restaurant.id, ...menuForm };

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
      const response = await fetch(`/api/partner/menu?id=${menuId}`, {
        method: 'DELETE'
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
      const response = await fetch('/api/partner/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      });

      if (response.ok) {
        await fetchDashboardData(restaurant.id);
      }
    } catch (error) {
      console.error('Erreur mise a jour commande:', error);
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('restaurantId', restaurant.id);

        const response = await fetch('/api/partner/upload-image', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const { imageUrl } = await response.json();
          setMenuForm(prev => ({ ...prev, image_url: imageUrl }));
        }
      } catch (error) {
        console.error('Erreur upload image:', error);
      }
    }
  };

  const fetchOrders = async (restaurantId) => {
    try {
      const response = await fetch(`/api/partner/orders?restaurantId=${restaurantId}`);
      const data = await response.json();
      if (response.ok) {
        setOrders(data);
        
        // Calculer les statistiques
        const today = new Date().toDateString();
        const todayOrders = data.filter(order => 
          new Date(order.created_at).toDateString() === today
        );
        
        const pendingOrders = data.filter(order => 
          order.status === 'en_attente'
        );
        
        const totalRevenue = data.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
        const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
        
        setStats({
          todayOrders: todayOrders.length,
          pendingOrders: pendingOrders.length,
          totalRevenue: todayRevenue,
          recentOrders: data.slice(0, 5)
        });
      }
    } catch (error) {
      console.error('Erreur récupération commandes:', error);
    }
  };

  const calculateCommission = (totalAmount) => {
    const amount = parseFloat(totalAmount || 0);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Partenaire</h1>
              <p className="text-gray-600">{restaurant?.nom}</p>
            </div>
            <div className="flex items-center space-x-4">
              <RealTimeNotifications restaurantId={restaurant?.id} />
              <button
                onClick={() => router.push('/partner/analytics')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
              >
                <FaChartLine className="h-4 w-4" />
                <span>Analytics</span>
              </button>
              <button
                onClick={() => router.push('/partner/reports')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <FaFileAlt className="h-4 w-4" />
                <span>Rapports</span>
              </button>
              <button
                onClick={() => router.push('/partner/hours')}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
              >
                <FaClock className="h-4 w-4" />
                <span>Horaires</span>
              </button>
              <button
                onClick={() => router.push('/partner/settings')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Paramètres</span>
              </button>
              <button
                onClick={() => router.push('/partner/delivery-zones')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <FaMapMarkerAlt className="h-4 w-4" />
                <span>Zones de livraison</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Commandes
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'menu'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Menu
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalRevenue.toFixed(2)} €</p>
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
                {stats.recentOrders.length === 0 ? (
                  <p className="text-gray-500 text-center">Aucune commande recente</p>
                ) : (
                  <div className="space-y-4">
                    {stats.recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Commande #{order.id}</p>
                          <p className="text-sm text-gray-600">{order.total_amount} €</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'ready' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
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
                    <p className="text-2xl font-semibold text-gray-900">{orders.length}</p>
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
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalRevenue.toFixed(2)} €</p>
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
                      {(stats.totalRevenue * 0.8).toFixed(2)} €
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
                {orders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucune commande pour le moment</p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const { commission, restaurantRevenue } = calculateCommission(order.total_amount);
                      return (
                        <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-medium text-gray-900">Commande #{order.id}</h3>
                              <p className="text-sm text-gray-600">
                                {new Date(order.created_at).toLocaleString('fr-FR')}
                              </p>
                              <p className="text-sm text-gray-600">
                                Client: {order.users?.nom} {order.users?.prenom}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-gray-900">
                                {order.total_amount} €
                              </p>
                              <p className="text-xs text-gray-500">
                                Commission CVN'EAT: {commission.toFixed(2)} €
                              </p>
                              <p className="text-sm font-medium text-green-600">
                                Votre gain: {restaurantRevenue.toFixed(2)} €
                              </p>
                            </div>
                          </div>
                          
                          {/* Articles de la commande */}
                          {order.order_items && order.order_items.length > 0 && (
                            <div className="mb-3">
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
                          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              order.status === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'acceptee' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'pret' ? 'bg-green-100 text-green-800' :
                              order.status === 'livree' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {order.status === 'en_attente' ? 'En attente' :
                               order.status === 'acceptee' ? 'Acceptée' :
                               order.status === 'pret' ? 'Prête' :
                               order.status === 'livree' ? 'Livrée' :
                               'Annulée'}
                            </span>
                            
                            <div className="flex space-x-2">
                              {order.status === 'en_attente' && (
                                <>
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'acceptee')}
                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                                  >
                                    Accepter
                                  </button>
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'refusee')}
                                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                                  >
                                    Refuser
                                  </button>
                                </>
                              )}
                              {order.status === 'acceptee' && (
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'pret')}
                                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                                >
                                  Marquer comme prête
                                </button>
                              )}
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
                {menu.length === 0 ? (
                  <p className="text-gray-500 text-center">Aucun plat dans le menu</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menu.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                        {/* Image du plat */}
                        {item.image_url && (
                          <div className="mb-3">
                            <img 
                              src={item.image_url} 
                              alt={item.nom}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900">{item.nom}</h3>
                          <div className="flex space-x-2">
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
                              <FaEdit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMenu(item.id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        
                        {/* Prix et catégorie */}
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-semibold text-lg text-green-600">{item.prix} €</p>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {item.category}
                          </span>
                        </div>
                        
                        {/* Suppléments */}
                        {item.supplements && item.supplements.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 mb-1">Suppléments :</p>
                            <div className="flex flex-wrap gap-1">
                              {item.supplements.map((supp, index) => (
                                <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {supp.nom} (+{supp.prix}€)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Taille de boisson */}
                        {item.boisson_taille && (
                          <div className="mb-2">
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              Taille: {item.boisson_taille}
                            </span>
                          </div>
                        )}
                        
                        {/* Statut de disponibilité */}
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
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

              {/* Upload d'image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image du plat
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
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
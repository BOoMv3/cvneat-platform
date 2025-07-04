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
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuForm, setMenuForm] = useState({
    nom: '',
    description: '',
    prix: '',
    category: '',
    disponible: true
  });
  const [editingMenu, setEditingMenu] = useState(null);
  const router = useRouter();

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
        setMenuForm({ nom: '', description: '', prix: '', category: '', disponible: true });
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
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Gestion des commandes</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-500">Interface de gestion des commandes en cours de developpement...</p>
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
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{item.nom}</h3>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingMenu(item);
                                setMenuForm(item);
                                setShowMenuModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMenu(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        <p className="font-semibold">{item.prix} €</p>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingMenu ? 'Modifier le plat' : 'Ajouter un plat'}
            </h3>
            <form onSubmit={handleMenuSubmit} className="space-y-4">
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
                  Description
                </label>
                <textarea
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({...menuForm, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
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
              <div className="flex space-x-3">
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
                    setMenuForm({ nom: '', description: '', prix: '', category: '', disponible: true });
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
    </div>
  );
} 
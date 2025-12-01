'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { 
  FaArrowLeft, 
  FaPlus, 
  FaCheck, 
  FaTimes, 
  FaSpinner, 
  FaCalendarAlt,
  FaStore,
  FaEuroSign,
  FaSearch
} from 'react-icons/fa';

export default function TransfersTracking() {
  const router = useRouter();
  const [transfers, setTransfers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRestaurant, setFilterRestaurant] = useState('all');
  
  // Formulaire nouveau virement
  const [formData, setFormData] = useState({
    restaurant_id: '',
    restaurant_name: '',
    amount: '',
    transfer_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    period_start: '',
    period_end: '',
    notes: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTransfers();
      fetchRestaurants();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (userError || !userData || userData.role !== 'admin') {
        router.push('/login');
        return;
      }

      setUser(currentUser);
    } catch (err) {
      console.error('Erreur d\'authentification:', err);
      router.push('/login');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, nom')
        .order('nom', { ascending: true });

      if (error) throw error;
      setRestaurants(data || []);
    } catch (err) {
      console.error('Erreur récupération restaurants:', err);
    }
  };

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('restaurant_transfers')
        .select('*')
        .order('transfer_date', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (err) {
      console.error('Erreur récupération virements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantChange = (restaurantId) => {
    const restaurant = restaurants.find(r => r.id === restaurantId);
    setFormData({
      ...formData,
      restaurant_id: restaurantId,
      restaurant_name: restaurant?.nom || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.restaurant_id || !formData.amount || !formData.transfer_date) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('restaurant_transfers')
        .insert([{
          restaurant_id: formData.restaurant_id,
          restaurant_name: formData.restaurant_name,
          amount: parseFloat(formData.amount),
          transfer_date: formData.transfer_date,
          reference_number: formData.reference_number || null,
          period_start: formData.period_start || null,
          period_end: formData.period_end || null,
          notes: formData.notes || null,
          created_by: user.id,
          status: 'completed'
        }])
        .select()
        .single();

      if (error) throw error;

      // Réinitialiser le formulaire
      setFormData({
        restaurant_id: '',
        restaurant_name: '',
        amount: '',
        transfer_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        period_start: '',
        period_end: '',
        notes: ''
      });
      
      setShowModal(false);
      fetchTransfers();
      alert('✅ Virement enregistré avec succès!');
    } catch (err) {
      console.error('Erreur création virement:', err);
      alert('Erreur lors de l\'enregistrement: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = searchTerm === '' || 
      transfer.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transfer.reference_number && transfer.reference_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRestaurant = filterRestaurant === 'all' || transfer.restaurant_id === filterRestaurant;
    
    return matchesSearch && matchesRestaurant;
  });

  const totalByRestaurant = restaurants.reduce((acc, restaurant) => {
    const restaurantTransfers = transfers.filter(t => t.restaurant_id === restaurant.id && t.status === 'completed');
    const total = restaurantTransfers.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    acc[restaurant.id] = total;
    return acc;
  }, {});

  if (authLoading || (loading && !transfers.length)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {authLoading ? 'Vérification des permissions...' : 'Chargement des données...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/payments')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Suivi des Virements</h1>
              <p className="text-gray-600 mt-1">Enregistrez et suivez tous vos virements aux restaurants</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus />
            <span>Nouveau Virement</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2 flex-1 min-w-[250px]">
              <FaSearch className="text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par restaurant ou référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterRestaurant}
              onChange={(e) => setFilterRestaurant(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les restaurants</option>
              {restaurants.map(restaurant => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Résumé par restaurant */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {restaurants.map(restaurant => {
            const total = totalByRestaurant[restaurant.id] || 0;
            if (total === 0) return null;
            return (
              <div key={restaurant.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FaStore className="text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{restaurant.nom}</p>
                      <p className="text-xs text-gray-500">Total versé</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-600">{total.toFixed(2)}€</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table des virements */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(transfer.transfer_date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaStore className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm font-medium text-gray-900">{transfer.restaurant_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600">
                        {parseFloat(transfer.amount).toFixed(2)}€
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {transfer.reference_number || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {transfer.period_start && transfer.period_end
                          ? `${new Date(transfer.period_start).toLocaleDateString('fr-FR')} - ${new Date(transfer.period_end).toLocaleDateString('fr-FR')}`
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {transfer.notes || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransfers.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun virement enregistré</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal nouveau virement */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Nouveau Virement</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Restaurant *
                  </label>
                  <select
                    value={formData.restaurant_id}
                    onChange={(e) => handleRestaurantChange(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un restaurant</option>
                    {restaurants.map(restaurant => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date du virement *
                    </label>
                    <input
                      type="date"
                      value={formData.transfer_date}
                      onChange={(e) => setFormData({...formData, transfer_date: e.target.value})}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de référence (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                    placeholder="Ex: VIR20241128001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Période début (optionnel)
                    </label>
                    <input
                      type="date"
                      value={formData.period_start}
                      onChange={(e) => setFormData({...formData, period_start: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Période fin (optionnel)
                    </label>
                    <input
                      type="date"
                      value={formData.period_end}
                      onChange={(e) => setFormData({...formData, period_end: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="3"
                    placeholder="Notes additionnelles sur ce virement..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <FaCheck />
                        <span>Enregistrer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


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
  const [restaurantsWithPayments, setRestaurantsWithPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showQuickValidateModal, setShowQuickValidateModal] = useState(false);
  const [selectedRestaurantForValidation, setSelectedRestaurantForValidation] = useState(null);
  const [quickValidateAmount, setQuickValidateAmount] = useState('');
  const [globalStats, setGlobalStats] = useState({
    totalDue: 0,
    totalTransferred: 0,
    remainingToPay: 0
  });
  
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
      fetchRestaurantPayments();
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

      if (error) {
        // Vérifier si c'est une erreur de table inexistante
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          setError('La table restaurant_transfers n\'existe pas. Veuillez exécuter la migration SQL dans Supabase.');
        } else {
          throw error;
        }
        return;
      }
      setTransfers(data || []);
    } catch (err) {
      console.error('Erreur récupération virements:', err);
      const errorMessage = err?.message || err?.error || err?.details || 'Erreur inconnue';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurantPayments = async () => {
    try {
      setLoadingPayments(true);
      
      // Récupérer tous les restaurants
      const { data: allRestaurants, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('id, nom, user_id, status')
        .order('nom', { ascending: true });

      if (restaurantsError) throw restaurantsError;

      // Pour chaque restaurant, calculer les revenus dus
      const restaurantsWithPaymentsData = await Promise.all(
        (allRestaurants || []).map(async (restaurant) => {
          // Récupérer TOUTES les commandes livrées et payées par le client
          // (même si elles ont été marquées comme payées au restaurant)
          const { data: orders, error: ordersError } = await supabase
            .from('commandes')
            .select('id, total, created_at, statut, payment_status, restaurant_paid_at')
            .eq('restaurant_id', restaurant.id)
            .eq('statut', 'livree');

          if (ordersError) {
            console.error(`Erreur récupération commandes pour ${restaurant.nom}:`, ordersError);
            return {
              ...restaurant,
              totalRevenue: 0,
              commission: 0,
              restaurantPayout: 0,
              totalTransfers: 0,
              remainingToPay: 0,
              orderCount: 0
            };
          }

          // Filtrer les commandes payées par le client
          const paidOrders = (orders || []).filter(order => 
            !order.payment_status || order.payment_status === 'paid'
          );

          // Calculer les revenus
          const totalRevenue = paidOrders.reduce((sum, order) => {
            return sum + (parseFloat(order.total || 0) || 0);
          }, 0);

          // Récupérer les virements déjà effectués pour ce restaurant
          let totalTransfers = 0;
          try {
            const { data: transfers, error: transfersError } = await supabase
              .from('restaurant_transfers')
              .select('amount, transfer_date, notes')
              .eq('restaurant_id', restaurant.id)
              .eq('status', 'completed');

            if (!transfersError && transfers) {
              totalTransfers = transfers.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
              console.log(`💰 ${restaurant.nom}: ${transfers.length} virement(s) = ${totalTransfers.toFixed(2)}€`);
            } else if (transfersError) {
              console.error(`❌ Erreur récupération virements pour ${restaurant.nom}:`, transfersError);
            }
          } catch (err) {
            console.warn(`Erreur récupération virements pour ${restaurant.nom}:`, err);
            // Continuer avec totalTransfers = 0
          }

          // Vérifier si c'est "La Bonne Pâte" (pas de commission)
          const normalizedRestaurantName = (restaurant.nom || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
          const isInternalRestaurant = normalizedRestaurantName.includes('la bonne pate');
          
          // Taux de commission (par défaut 20%)
          const commissionRate = isInternalRestaurant ? 0 : 0.20;
          
          const commission = totalRevenue * commissionRate;
          const restaurantPayout = totalRevenue - commission;
          
          // Calculer ce qui reste à payer (revenus dus - virements déjà effectués)
          const remainingToPay = Math.max(0, restaurantPayout - totalTransfers);

          return {
            ...restaurant,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            commission: Math.round(commission * 100) / 100,
            restaurantPayout: Math.round(restaurantPayout * 100) / 100,
            totalTransfers: Math.round(totalTransfers * 100) / 100,
            remainingToPay: Math.round(remainingToPay * 100) / 100,
            orderCount: paidOrders.length,
            commissionRate: commissionRate * 100
          };
        })
      );

      // Trier par montant dû (décroissant)
      restaurantsWithPaymentsData.sort((a, b) => b.restaurantPayout - a.restaurantPayout);
      setRestaurantsWithPayments(restaurantsWithPaymentsData);
      
      // Calculer le total global
      const globalTotal = restaurantsWithPaymentsData.reduce((sum, r) => sum + r.restaurantPayout, 0);
      const globalTransfers = restaurantsWithPaymentsData.reduce((sum, r) => sum + r.totalTransfers, 0);
      const globalRemaining = restaurantsWithPaymentsData.reduce((sum, r) => sum + r.remainingToPay, 0);
      setGlobalStats({
        totalDue: globalTotal,
        totalTransferred: globalTransfers,
        remainingToPay: globalRemaining
      });
    } catch (err) {
      console.error('Erreur récupération paiements dus:', err);
    } finally {
      setLoadingPayments(false);
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

  const handleQuickPayment = (restaurant) => {
    if (restaurant.remainingToPay > 0) {
      setFormData({
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.nom,
        amount: restaurant.remainingToPay.toFixed(2),
        transfer_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        period_start: '',
        period_end: '',
        notes: `Paiement ${restaurant.nom} - ${restaurant.orderCount} commande(s)`
      });
      setShowModal(true);
    }
  };

  const handleQuickValidateClick = (restaurant) => {
    setSelectedRestaurantForValidation(restaurant);
    setQuickValidateAmount(restaurant.remainingToPay.toFixed(2));
    setShowQuickValidateModal(true);
  };

  const handleQuickValidate = async () => {
    if (!selectedRestaurantForValidation) return;
    
    const amount = parseFloat(quickValidateAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }

    if (!confirm(`Confirmer le virement de ${amount.toFixed(2)}€ à ${selectedRestaurantForValidation.nom} ?`)) {
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('restaurant_transfers')
        .insert([{
          restaurant_id: selectedRestaurantForValidation.id,
          restaurant_name: selectedRestaurantForValidation.nom,
          amount: amount,
          transfer_date: new Date().toISOString().split('T')[0],
          reference_number: null,
          period_start: null,
          period_end: null,
          notes: `Virement validé rapidement - ${selectedRestaurantForValidation.orderCount} commande(s)`,
          created_by: user.id,
          status: 'completed'
        }])
        .select()
        .single();

      if (error) throw error;

      // Marquer toutes les commandes non payées du restaurant comme payées
      const { error: markPaidError } = await supabase
        .from('commandes')
        .update({
          restaurant_paid_at: new Date().toISOString()
        })
        .eq('restaurant_id', selectedRestaurantForValidation.id)
        .eq('statut', 'livree')
        .is('restaurant_paid_at', null);

      if (markPaidError) {
        console.error('Erreur marquage commandes comme payées:', markPaidError);
        // Ne pas faire échouer la validation si le marquage échoue
        alert('⚠️ Virement enregistré mais erreur lors du marquage des commandes. Veuillez vérifier manuellement.');
      }

      alert('✅ Virement validé et enregistré avec succès!');
      setShowQuickValidateModal(false);
      setSelectedRestaurantForValidation(null);
      setQuickValidateAmount('');
      fetchTransfers();
      fetchRestaurantPayments(); // Recharger les montants dus (devrait maintenant être à 0)
    } catch (err) {
      console.error('Erreur validation virement:', err);
      const errorMessage = err?.message || err?.error || err?.details || 'Erreur inconnue';
      alert('Erreur lors de la validation: ' + errorMessage);
    } finally {
      setLoading(false);
    }
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

      // Marquer toutes les commandes non payées du restaurant comme payées
      const { error: markPaidError } = await supabase
        .from('commandes')
        .update({
          restaurant_paid_at: new Date().toISOString()
        })
        .eq('restaurant_id', formData.restaurant_id)
        .eq('statut', 'livree')
        .is('restaurant_paid_at', null);

      if (markPaidError) {
        console.error('Erreur marquage commandes comme payées:', markPaidError);
        // Ne pas faire échouer la validation si le marquage échoue
        alert('⚠️ Virement enregistré mais erreur lors du marquage des commandes. Veuillez vérifier manuellement.');
      }

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
      fetchRestaurantPayments(); // Recharger les montants dus
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

        {/* Total global */}
        {!loadingPayments && globalStats.totalDue > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total dû aux restaurants</p>
                  <p className="text-3xl font-bold mt-1">{globalStats.totalDue.toFixed(2)}€</p>
                </div>
                <FaStore className="h-10 w-10 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total déjà versé</p>
                  <p className="text-3xl font-bold mt-1">{globalStats.totalTransferred.toFixed(2)}€</p>
                </div>
                <FaEuroSign className="h-10 w-10 opacity-80" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Reste à payer</p>
                  <p className="text-3xl font-bold mt-1">{globalStats.remainingToPay.toFixed(2)}€</p>
                </div>
                <FaCheck className="h-10 w-10 opacity-80" />
              </div>
            </div>
          </div>
        )}

        {/* Section : Montants dus aux restaurants */}
        {!loadingPayments && restaurantsWithPayments.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Montants dus aux restaurants</h2>
            <div className="space-y-3">
              {restaurantsWithPayments
                .filter(r => r.remainingToPay > 0)
                .map((restaurant) => (
                  <div key={restaurant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <FaStore className="text-blue-600" />
                        <div>
                          <p className="font-semibold text-gray-900">{restaurant.nom}</p>
                          <p className="text-sm text-gray-600">
                            {restaurant.orderCount} commande(s) • CA: {restaurant.totalRevenue.toFixed(2)}€ • Commission: {restaurant.commission.toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Montant dû</p>
                        <p className="text-xl font-bold text-purple-600">{restaurant.remainingToPay.toFixed(2)}€</p>
                        {restaurant.totalTransfers > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Déjà versé: {restaurant.totalTransfers.toFixed(2)}€
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuickValidateClick(restaurant)}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          disabled={loading || restaurant.remainingToPay <= 0}
                        >
                          <FaCheck />
                          <span>J'ai effectué ce virement</span>
                        </button>
                        <button
                          onClick={() => handleQuickPayment(restaurant)}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          disabled={loading}
                        >
                          <span>Détails</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              {restaurantsWithPayments.filter(r => r.remainingToPay > 0).length === 0 && (
                <p className="text-gray-500 text-center py-4">Aucun montant dû pour le moment</p>
              )}
            </div>
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

      {/* Modal validation rapide */}
      {showQuickValidateModal && selectedRestaurantForValidation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Valider le virement</h2>
                <button
                  onClick={() => {
                    setShowQuickValidateModal(false);
                    setSelectedRestaurantForValidation(null);
                    setQuickValidateAmount('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Restaurant</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedRestaurantForValidation.nom}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant du virement (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickValidateAmount}
                    onChange={(e) => setQuickValidateAmount(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-semibold"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Montant dû: {selectedRestaurantForValidation.restaurantPayout.toFixed(2)}€
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date du virement
                  </label>
                  <input
                    type="date"
                    value={new Date().toISOString().split('T')[0]}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickValidateModal(false);
                      setSelectedRestaurantForValidation(null);
                      setQuickValidateAmount('');
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleQuickValidate}
                    disabled={loading || !quickValidateAmount || parseFloat(quickValidateAmount) <= 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>Validation...</span>
                      </>
                    ) : (
                      <>
                        <FaCheck />
                        <span>Valider</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


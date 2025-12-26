'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaArrowLeft, FaEuroSign, FaStore, FaSpinner, FaDownload, FaCalendarAlt, FaListAlt, FaCheck, FaTimes, FaMotorcycle } from 'react-icons/fa';
import Link from 'next/link';

export default function AdminPayments() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'month', 'week', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
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
      fetchRestaurantPayments();
    }
  }, [user, dateFilter, customStartDate, customEndDate]);

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

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateFilter) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          return null;
        }
        break;
      default: // 'all'
        return null;
    }

    return { startDate, endDate };
  };

  const fetchRestaurantPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer tous les restaurants avec leur commission_rate
      const { data: allRestaurants, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('id, nom, user_id, status, commission_rate')
        .order('nom', { ascending: true });

      if (restaurantsError) throw restaurantsError;

      const dateRange = getDateRange();
      const dateFilterQuery = dateRange 
        ? { gte: dateRange.startDate.toISOString(), lte: dateRange.endDate.toISOString() }
        : {};

      // Pour chaque restaurant, calculer les revenus
      const restaurantsWithPayments = await Promise.all(
        (allRestaurants || []).map(async (restaurant) => {
          // Récupérer les commandes livrées pour ce restaurant
          // IMPORTANT: Ne filtrer que par statut 'livree', payment_status peut ne pas exister ou être différent
          let query = supabase
            .from('commandes')
            .select('id, total, created_at, statut, payment_status, commission_amount, restaurant_payout, commission_rate')
            .eq('restaurant_id', restaurant.id)
            .eq('statut', 'livree');
          
          // Ne pas filtrer par payment_status ici car certaines commandes peuvent ne pas avoir cette colonne
          // On filtrera après la récupération

          if (dateRange) {
            query = query.gte('created_at', dateRange.startDate.toISOString())
                        .lte('created_at', dateRange.endDate.toISOString());
          }

          const { data: orders, error: ordersError } = await query;

          if (ordersError) {
            console.error(`Erreur récupération commandes pour ${restaurant.nom}:`, ordersError);
            return {
              ...restaurant,
              totalRevenue: 0,
              commission: 0,
              restaurantPayout: 0,
              orderCount: 0,
              error: ordersError.message
            };
          }

          // Filtrer les commandes payées (si payment_status existe, sinon toutes les livrées sont considérées payées)
          const paidOrders = (orders || []).filter(order => {
            // Si payment_status existe, vérifier qu'il est 'paid'
            // Sinon, considérer toutes les commandes livrées comme payées
            return !order.payment_status || order.payment_status === 'paid';
          });

          console.log(`📊 ${restaurant.nom}: ${paidOrders.length} commandes payées sur ${orders?.length || 0} commandes livrées`);

          // Calculer les revenus et commissions
          // Si les commandes ont déjà commission_amount et restaurant_payout stockés, les utiliser
          // Sinon, recalculer avec le taux du restaurant
          let totalRevenue = 0;
          let totalCommission = 0;
          let totalRestaurantPayout = 0;
          let hasStoredCommissions = false;

          // Vérifier si c'est "La Bonne Pâte" (pas de commission)
          const normalizedRestaurantName = (restaurant.nom || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
          const isInternalRestaurant = normalizedRestaurantName.includes('la bonne pate');

          // Taux de commission : utiliser commission_rate du restaurant (par défaut 20% si non défini)
          // La Bonne Pâte = 0%, sinon utiliser le commission_rate du restaurant
          const restaurantCommissionRate = restaurant.commission_rate 
            ? parseFloat(restaurant.commission_rate) / 100 
            : 0.20; // 20% par défaut
          const commissionRate = isInternalRestaurant ? 0 : restaurantCommissionRate;
          
          // Log pour debug
          console.log(`💰 ${restaurant.nom}: commission_rate=${restaurant.commission_rate}, calculé=${commissionRate * 100}%`);

          // TOUJOURS recalculer avec le taux actuel du restaurant pour garantir l'exactitude
          // même si des valeurs sont stockées (elles peuvent être basées sur d'anciens taux)
          paidOrders.forEach(order => {
            const orderTotal = parseFloat(order.total || 0);
            if (isNaN(orderTotal)) {
              console.warn(`⚠️ Commande ${order.id} avec total invalide:`, order.total);
              return;
            }
            totalRevenue += orderTotal;

            // Recalculer la commission avec le taux actuel du restaurant
            // Utiliser Math.round pour éviter les erreurs d'arrondi
            const orderCommission = Math.round((orderTotal * commissionRate) * 100) / 100;
            const orderPayout = Math.round((orderTotal - orderCommission) * 100) / 100;
            
            totalCommission += orderCommission;
            totalRestaurantPayout += orderPayout;
          });

          // Afficher le taux de commission du restaurant (pas un calcul moyen basé sur les commissions réelles)
          // Utiliser le commission_rate du restaurant (0% pour La Bonne Pâte, sinon le taux du restaurant)
          const displayCommissionRate = isInternalRestaurant 
            ? 0 
            : (restaurant.commission_rate !== null && restaurant.commission_rate !== undefined 
                ? restaurant.commission_rate 
                : 20);

          const result = {
            ...restaurant,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            commission: Math.round(totalCommission * 100) / 100,
            restaurantPayout: Math.round(totalRestaurantPayout * 100) / 100,
            orderCount: paidOrders.length,
            commissionRate: displayCommissionRate
          };
          
          // Log pour debug
          console.log(`💰 Résultat ${restaurant.nom}: CA=${result.totalRevenue}€, Commission=${result.commission}€, Dû=${result.restaurantPayout}€, Taux=${result.commissionRate}%`);
          
          return result;
        })
      );

      // Trier par montant dû (décroissant)
      restaurantsWithPayments.sort((a, b) => b.restaurantPayout - a.restaurantPayout);

      setRestaurants(restaurantsWithPayments);
    } catch (err) {
      console.error('Erreur récupération paiements:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totals = restaurants.reduce((acc, restaurant) => {
      acc.totalRevenue += restaurant.totalRevenue || 0;
      acc.totalCommission += restaurant.commission || 0;
      acc.totalPayout += restaurant.restaurantPayout || 0;
      acc.totalOrders += restaurant.orderCount || 0;
      return acc;
    }, { totalRevenue: 0, totalCommission: 0, totalPayout: 0, totalOrders: 0 });

    return {
      totalRevenue: Math.round(totals.totalRevenue * 100) / 100,
      totalCommission: Math.round(totals.totalCommission * 100) / 100,
      totalPayout: Math.round(totals.totalPayout * 100) / 100,
      totalOrders: totals.totalOrders
    };
  };

  const exportToCSV = () => {
    const totals = calculateTotals();
    const dateRange = getDateRange();
    const periodText = dateFilter === 'all' 
      ? 'Toutes périodes' 
      : dateFilter === 'month' 
        ? 'Ce mois' 
        : dateFilter === 'week' 
          ? '7 derniers jours' 
          : `${customStartDate} au ${customEndDate}`;

    let csv = 'Restaurant;CA Total (€);Commission CVN\'EAT (€);Montant dû (€);Nb Commandes;Taux Commission (%)\n';
    
    restaurants.forEach(restaurant => {
      csv += `${restaurant.nom || 'Inconnu'};${restaurant.totalRevenue.toFixed(2)};${restaurant.commission.toFixed(2)};${restaurant.restaurantPayout.toFixed(2)};${restaurant.orderCount};${restaurant.commissionRate.toFixed(1)}\n`;
    });

    csv += `\nTOTAL;${totals.totalRevenue.toFixed(2)};${totals.totalCommission.toFixed(2)};${totals.totalPayout.toFixed(2)};${totals.totalOrders};\n`;
    csv += `\nPériode: ${periodText}\n`;
    csv += `Date export: ${new Date().toLocaleString('fr-FR')}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `paiements-partenaires-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || (loading && !restaurants.length)) {
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

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Paiements Partenaires</h1>
              <p className="text-gray-600 mt-1">Gestion des paiements aux restaurants partenaires</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/admin/payments/transfers"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaListAlt />
              <span>Suivi des Virements</span>
            </Link>
            <Link
              href="/admin/payments/delivery-transfers"
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FaMotorcycle />
              <span>Paiements Livreurs</span>
            </Link>
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaDownload />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <FaCalendarAlt className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Période:</span>
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes périodes</option>
              <option value="month">Ce mois</option>
              <option value="week">7 derniers jours</option>
              <option value="custom">Période personnalisée</option>
            </select>

            {dateFilter === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Date début"
                />
                <span className="text-gray-500">au</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Date fin"
                />
              </>
            )}
          </div>
        </div>

        {/* Totaux */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CA Total</p>
                <p className="text-2xl font-bold text-gray-900">{totals.totalRevenue.toFixed(2)}€</p>
              </div>
              <FaEuroSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Commission CVN'EAT</p>
                <p className="text-2xl font-bold text-green-600">{totals.totalCommission.toFixed(2)}€</p>
              </div>
              <FaEuroSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total dû aux restaurants</p>
                <p className="text-2xl font-bold text-purple-600">{totals.totalPayout.toFixed(2)}€</p>
              </div>
              <FaStore className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Commandes livrées</p>
                <p className="text-2xl font-bold text-gray-900">{totals.totalOrders}</p>
              </div>
              <FaStore className="h-8 w-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Table des restaurants */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CA Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission CVN'EAT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant dû
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commandes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {restaurants.map((restaurant) => (
                  <tr key={restaurant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaStore className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{restaurant.nom}</div>
                          {restaurant.status && restaurant.status !== 'active' && restaurant.status !== 'approved' && (
                            <div className="text-xs text-red-600">Inactif</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {restaurant.totalRevenue.toFixed(2)}€
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        {restaurant.commission.toFixed(2)}€
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-purple-600">
                        {restaurant.restaurantPayout.toFixed(2)}€
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {restaurant.orderCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {restaurant.commissionRate.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {restaurant.restaurantPayout > 0 && (
                        <button
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            setPaymentFormData({
                              amount: restaurant.restaurantPayout.toFixed(2),
                              transfer_date: new Date().toISOString().split('T')[0],
                              reference_number: '',
                              period_start: '',
                              period_end: '',
                              notes: `Paiement ${restaurant.nom} - ${dateFilter === 'all' ? 'Toutes périodes' : dateFilter === 'month' ? 'Ce mois' : dateFilter === 'week' ? '7 derniers jours' : 'Période personnalisée'}`
                            });
                            setShowPaymentModal(true);
                          }}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <FaCheck />
                          <span>Valider paiement</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {totals.totalRevenue.toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    {totals.totalCommission.toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600">
                    {totals.totalPayout.toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {totals.totalOrders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {restaurants.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun restaurant trouvé pour cette période</p>
            </div>
          )}
        </div>

        {/* Note importante */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note importante:</strong> Les montants affichés sont basés uniquement sur les commandes <strong>livrées et payées</strong>. 
            Les frais de livraison ne sont pas inclus dans le calcul car ils reviennent aux livreurs.
            Le CA total correspond uniquement au montant des articles commandés.
          </p>
        </div>
      </div>
    </div>
  );
}


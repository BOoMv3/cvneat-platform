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
  FaMotorcycle,
  FaEuroSign,
  FaSearch
} from 'react-icons/fa';

export default function DeliveryTransfersTracking() {
  const router = useRouter();
  const [transfers, setTransfers] = useState([]);
  const [deliveryDrivers, setDeliveryDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDriver, setFilterDriver] = useState('all');
  const [driversWithPayments, setDriversWithPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [globalStats, setGlobalStats] = useState({
    totalDue: 0,
    totalTransferred: 0,
    remainingToPay: 0
  });
  
  // Formulaire nouveau virement
  const [formData, setFormData] = useState({
    delivery_id: '',
    delivery_name: '',
    delivery_email: '',
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
      fetchDeliveryDrivers();
      fetchDriverPayments();
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

  const fetchDeliveryDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, nom, prenom, email')
        .eq('role', 'delivery')
        .order('nom', { ascending: true });

      if (error) throw error;
      setDeliveryDrivers(data || []);
    } catch (err) {
      console.error('Erreur récupération livreurs:', err);
    }
  };

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('delivery_transfers')
        .select('*')
        .order('transfer_date', { ascending: false });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          setError('La table delivery_transfers n\'existe pas. Veuillez exécuter le script SQL dans Supabase.');
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

  const fetchDriverPayments = async () => {
    try {
      setLoadingPayments(true);
      
      // Récupérer TOUS les livreurs (pas seulement Théo)
      // Cette fonction calcule les gains dus pour chaque livreur
      const { data: allDrivers, error: driversError } = await supabase
        .from('users')
        .select('id, nom, prenom, email')
        .eq('role', 'delivery')
        .order('nom', { ascending: true });

      if (driversError) throw driversError;

      // Pour chaque livreur, calculer les gains dus
      // Les gains dus = somme des frais_livraison des commandes avec livreur_paid_at IS NULL
      // Quand on marque les commandes comme payées via l'API, les dashboards se mettent à jour automatiquement
      const driversWithPaymentsData = await Promise.all(
        (allDrivers || []).map(async (driver) => {
          // Récupérer les commandes livrées non payées
          // IMPORTANT: livreur_paid_at IS NULL = commandes non encore payées
          const { data: orders, error: ordersError } = await supabase
            .from('commandes')
            .select('id, frais_livraison, delivery_commission_cvneat, created_at, statut')
            .eq('livreur_id', driver.id)
            .eq('statut', 'livree')
            .is('livreur_paid_at', null);

          if (ordersError) {
            console.error(`Erreur récupération commandes pour ${driver.email}:`, ordersError);
            return {
              ...driver,
              totalEarnings: 0,
              totalTransfers: 0,
              remainingToPay: 0,
              orderCount: 0
            };
          }

          // Calculer les gains dus (somme des gains réels du livreur = frais_livraison - commission)
          const totalEarnings = (orders || []).reduce((sum, order) => {
            const fraisLivraison = parseFloat(order.frais_livraison || 0);
            const commission = parseFloat(order.delivery_commission_cvneat || 0);
            const livreurEarning = fraisLivraison - commission; // Gain réel du livreur
            return sum + livreurEarning;
          }, 0);

          // Récupérer les virements déjà effectués pour ce livreur
          let totalTransfers = 0;
          try {
            const { data: transfers, error: transfersError } = await supabase
              .from('delivery_transfers')
              .select('amount, transfer_date, notes')
              .eq('delivery_id', driver.id)
              .eq('status', 'completed');

            if (!transfersError && transfers) {
              totalTransfers = transfers.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            }
          } catch (err) {
            console.warn(`Erreur récupération virements pour ${driver.email}:`, err);
          }

          // Calculer ce qui reste à payer (gains dus - virements déjà effectués)
          // Note: On suppose que les virements marquent les commandes comme payées
          // Donc remainingToPay = totalEarnings (commandes non payées actuellement)
          const remainingToPay = totalEarnings;

          return {
            ...driver,
            totalEarnings: Math.round(totalEarnings * 100) / 100,
            totalTransfers: Math.round(totalTransfers * 100) / 100,
            remainingToPay: Math.round(remainingToPay * 100) / 100,
            orderCount: orders?.length || 0
          };
        })
      );

      // Trier par montant dû (décroissant)
      driversWithPaymentsData.sort((a, b) => b.remainingToPay - a.remainingToPay);
      setDriversWithPayments(driversWithPaymentsData);
      
      // Calculer le total global
      const globalTotal = driversWithPaymentsData.reduce((sum, d) => sum + d.totalEarnings, 0);
      const globalTransfers = driversWithPaymentsData.reduce((sum, d) => sum + d.totalTransfers, 0);
      const globalRemaining = driversWithPaymentsData.reduce((sum, d) => sum + d.remainingToPay, 0);
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

  const handleDriverChange = (driverId) => {
    const driver = deliveryDrivers.find(d => d.id === driverId);
    setFormData({
      ...formData,
      delivery_id: driverId,
      delivery_name: `${driver?.prenom || ''} ${driver?.nom || ''}`.trim() || driver?.email || '',
      delivery_email: driver?.email || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.delivery_id || !formData.amount) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      // Appeler l'API pour créer le paiement et marquer les commandes
      const response = await fetch('/api/admin/delivery-payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          delivery_id: formData.delivery_id,
          delivery_name: formData.delivery_name,
          delivery_email: formData.delivery_email,
          amount: parseFloat(formData.amount),
          transfer_date: formData.transfer_date,
          reference_number: formData.reference_number || null,
          period_start: formData.period_start || null,
          period_end: formData.period_end || null,
          notes: formData.notes || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du paiement');
      }

      // Réinitialiser le formulaire
      setFormData({
        delivery_id: '',
        delivery_name: '',
        delivery_email: '',
        amount: '',
        transfer_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        period_start: '',
        period_end: '',
        notes: ''
      });

      setShowModal(false);
      
      // Recharger les données pour mettre à jour l'affichage
      // Les dashboards des livreurs se mettront à jour automatiquement car ils utilisent livreur_paid_at IS NULL
      fetchTransfers();
      fetchDriverPayments();
      
      const message = data.message || `Paiement de ${formData.amount}€ enregistré avec succès !`;
      alert(message);
    } catch (err) {
      console.error('Erreur création paiement:', err);
      setError(err.message || 'Erreur lors de la création du paiement');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = !searchTerm || 
      transfer.delivery_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.delivery_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDriver = filterDriver === 'all' || transfer.delivery_id === filterDriver;
    
    return matchesSearch && matchesDriver;
  });

  const filteredDrivers = driversWithPayments.filter(driver => {
    return filterDriver === 'all' || driver.id === filterDriver;
  });

  if (authLoading || (loading && !transfers.length && !driversWithPayments.length)) {
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
              <h1 className="text-3xl font-bold text-gray-900">Paiements Livreurs</h1>
              <p className="text-gray-600 mt-1">Gestion des paiements aux livreurs</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus />
            <span>Nouveau Paiement</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Stats Globales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total dû</p>
                <p className="text-2xl font-bold text-gray-900">{globalStats.totalDue.toFixed(2)}€</p>
              </div>
              <FaEuroSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total payé</p>
                <p className="text-2xl font-bold text-green-600">{globalStats.totalTransferred.toFixed(2)}€</p>
              </div>
              <FaCheck className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reste à payer</p>
                <p className="text-2xl font-bold text-orange-600">{globalStats.remainingToPay.toFixed(2)}€</p>
              </div>
              <FaMotorcycle className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Liste des livreurs avec montants dus */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Gains dus aux livreurs</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <FaSearch className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les livreurs</option>
                  {deliveryDrivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {`${driver.prenom || ''} ${driver.nom || ''}`.trim() || driver.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loadingPayments ? (
            <div className="p-8 text-center">
              <FaSpinner className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Chargement des données...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Livreur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commandes non payées
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gains dus
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total payé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reste à payer
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaMotorcycle className="h-5 w-5 text-blue-600 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            {`${driver.prenom || ''} ${driver.nom || ''}`.trim() || driver.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {driver.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {driver.orderCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {driver.totalEarnings.toFixed(2)}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {driver.totalTransfers.toFixed(2)}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                        {driver.remainingToPay.toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                  {filteredDrivers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        Aucun livreur trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Historique des virements */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Historique des paiements</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <FaSpinner className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Chargement des données...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Livreur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Référence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transfer.transfer_date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transfer.delivery_name}
                        </div>
                        <div className="text-sm text-gray-500">{transfer.delivery_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {parseFloat(transfer.amount).toFixed(2)}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transfer.reference_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transfer.status === 'completed' ? 'bg-green-100 text-green-800' :
                          transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transfer.status === 'completed' ? 'Payé' :
                           transfer.status === 'pending' ? 'En attente' :
                           'Annulé'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {transfer.notes || '-'}
                      </td>
                    </tr>
                  ))}
                  {filteredTransfers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        Aucun paiement enregistré
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal nouveau paiement */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Nouveau Paiement Livreur</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Livreur *
                    </label>
                    <select
                      value={formData.delivery_id}
                      onChange={(e) => handleDriverChange(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un livreur</option>
                      {deliveryDrivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {`${driver.prenom || ''} ${driver.nom || ''}`.trim() || driver.email} ({driver.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Montant (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date du paiement *
                    </label>
                    <input
                      type="date"
                      value={formData.transfer_date}
                      onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de référence
                    </label>
                    <input
                      type="text"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Référence bancaire (optionnel)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Période début
                      </label>
                      <input
                        type="date"
                        value={formData.period_start}
                        onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Période fin
                      </label>
                      <input
                        type="date"
                        value={formData.period_end}
                        onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Notes additionnelles (optionnel)"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
        )}
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaEye, FaSpinner } from 'react-icons/fa';

export default function AdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('paid'); // 'paid' = payées uniquement, 'all' = toutes

  useEffect(() => {
    fetchOrders();
  }, [filterStatus, filterPayment]);

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('commandes')
        .select('*')
        .order('created_at', { ascending: false });

      // Par défaut : afficher uniquement les commandes payées
      if (filterPayment === 'paid') {
        query = query.in('payment_status', ['paid', 'succeeded']);
      }

      if (filterStatus !== 'all') {
        // Mapper les statuts anglais vers français
        const statusMap = {
          'pending': 'en_attente',
          'accepted': 'acceptee', 
          'rejected': 'refusee',
          'preparing': 'en_preparation',
          'ready': 'pret_a_livrer',
          'delivered': 'livree'
        };
        const frenchStatus = statusMap[filterStatus] || filterStatus;
        query = query.eq('statut', frenchStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setOrders(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800';
      case 'acceptee':
        return 'bg-green-100 text-green-800';
      case 'refusee':
        return 'bg-red-100 text-red-800';
      case 'en_preparation':
        return 'bg-blue-100 text-blue-800';
      case 'pret_a_livrer':
        return 'bg-purple-100 text-purple-800';
      case 'livree':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'en_attente':
        return 'En attente';
      case 'acceptee':
        return 'Acceptée';
      case 'refusee':
        return 'Refusée';
      case 'en_preparation':
        return 'En préparation';
      case 'pret_a_livrer':
        return 'Prête';
      case 'livree':
        return 'Livrée';
      default:
        return status;
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
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gestion des commandes</h1>
          <button
            onClick={() => router.push('/admin')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}

        {/* Filtres paiement */}
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Paiement</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterPayment('paid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterPayment === 'paid' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              ✓ Payées uniquement (défaut)
            </button>
            <button
              onClick={() => setFilterPayment('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterPayment === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Toutes (y compris non payées)
            </button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Les commandes non payées sont celles abandonnées avant validation du paiement (panier non finalisé).
          </p>
        </div>

        {/* Filtres statut */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'pending' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setFilterStatus('accepted')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'accepted' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Acceptées
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'rejected' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Refusées
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '1200px' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restaurant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">#{order.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Client #{order.user_id || 'Anonyme'}</div>
                    <div className="text-sm text-gray-500">ID: {order.user_id || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Restaurant #{order.restaurant_id}</div>
                    <div className="text-sm text-gray-500">ID: {order.restaurant_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString('fr-FR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.statut)}`}>
                        {getStatusText(order.statut)}
                      </span>
                      {(!order.payment_status || !['paid', 'succeeded'].includes((order.payment_status || '').toString().toLowerCase())) && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800" title="Client n'a pas terminé le paiement">
                          Non payée
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.total ? order.total.toFixed(2) + '€' : '0.00€'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Dont {order.frais_livraison || 0}€ de livraison
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                      className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
                      title="Voir les détails"
                    >
                      <FaEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterStatus === 'all' 
                  ? 'Aucune commande trouvée' 
                  : `Aucune commande avec le statut "${getStatusText(filterStatus)}"`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
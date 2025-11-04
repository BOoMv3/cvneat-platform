'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  FaArrowLeft, 
  FaFilter, 
  FaDownload, 
  FaStar, 
  FaCalendarAlt,
  FaSearch,
  FaEye
} from 'react-icons/fa';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4YnFydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ4NzcsImV4cCI6MjA1MDA1MDg3N30.G7iFlb2vKi1ouABfyI_azLbZ8XGi66tf9kx_dtVIE40'
);

export default function DeliveryHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchHistory();
  }, [filters, pagination.page]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ Pas de session');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '20'
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/delivery/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
      } else {
        console.error('❌ Erreur récupération historique:', data.error || data);
      }
    } catch (error) {
      console.error('❌ Erreur récupération historique:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      'ID',
      'Date',
      'Restaurant',
      'Client',
      'Adresse',
      'Total',
      'Frais livraison',
      'Statut',
      'Note',
      'Commentaire'
    ];

    const csvContent = [
      headers.join(','),
      ...orders.map(order => [
        order.id,
        new Date(order.created_at).toLocaleDateString('fr-FR'),
        `"${order.restaurant_nom}"`,
        `"${order.customer_name}"`,
        `"${order.delivery_address}"`,
        order.total,
        order.delivery_fee,
        order.status,
        order.rating || '',
        `"${order.comment || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique_livraisons_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'livree': return 'bg-green-100 text-green-800';
      case 'en_livraison': return 'bg-blue-100 text-blue-800';
      case 'pret_a_livrer': return 'bg-yellow-100 text-yellow-800';
      case 'annulee': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'livree': return 'Livrée';
      case 'en_livraison': return 'En livraison';
      case 'pret_a_livrer': return 'Prêt à livrer';
      case 'annulee': return 'Annulée';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => router.push('/delivery/dashboard')}
                className="text-gray-600 hover:text-gray-900 min-h-[44px] touch-manipulation"
              >
                <FaArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Historique des livraisons</h1>
                <p className="text-sm sm:text-base text-gray-600">{pagination.total} livraisons au total</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 min-h-[44px] touch-manipulation text-sm w-full sm:w-auto"
              >
                <FaFilter className="h-4 w-4" />
                <span>Filtres</span>
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-[44px] touch-manipulation text-sm w-full sm:w-auto"
              >
                <FaDownload className="h-4 w-4" />
                <span>Exporter CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Filtres */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Filtres</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                >
                  <option value="">Tous les statuts</option>
                  <option value="livree">Livrée</option>
                  <option value="en_livraison">En livraison</option>
                  <option value="pret_a_livrer">Prêt à livrer</option>
                  <option value="annulee">Annulée</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                />
              </div>
            </div>
          </div>
        )}

        {/* Liste des livraisons */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Livraisons</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FaCalendarAlt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune livraison trouvée</p>
            </div>
          ) : (
            <div className="divide-y">
              {orders.map((order) => (
                <div key={order.id} className="p-4 sm:p-6 hover:bg-gray-50">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base">Commande #{order.id}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                        {order.rating && (
                          <div className="flex items-center space-x-1">
                            <FaStar className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs sm:text-sm text-gray-600">{order.rating}/5</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Restaurant</p>
                          <p className="font-medium text-sm sm:text-base">{order.restaurant_nom}</p>
                          <p className="text-gray-500 text-xs sm:text-sm">{order.restaurant_adresse}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Client</p>
                          <p className="font-medium text-sm sm:text-base">{order.customer_name}</p>
                          <p className="text-gray-500 text-xs sm:text-sm">{order.delivery_address}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                        <span>Total: {order.total}€</span>
                        <span>Frais: {order.delivery_fee}€</span>
                        <span className="break-all">{new Date(order.created_at).toLocaleString('fr-FR')}</span>
                      </div>
                      
                      {order.comment && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{order.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 sm:mt-6 flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 min-h-[44px] touch-manipulation text-sm"
              >
                Précédent
              </button>
              
              <span className="px-3 py-2 text-gray-700 text-sm">
                Page {pagination.page} sur {pagination.totalPages}
              </span>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 min-h-[44px] touch-manipulation text-sm"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import PageHeader from '../../../components/PageHeader';
import { 
  FaExclamationTriangle, 
  FaEye, 
  FaCheck, 
  FaTimes, 
  FaSpinner,
  FaFilter,
  FaSearch,
  FaCalendarAlt,
  FaEuroSign,
  FaUser,
  FaStore
} from 'react-icons/fa';

export default function AdminComplaints() {
  const router = useRouter();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Filtres
  const [filters, setFilters] = useState({
    status: '',
    complaintType: '',
    dateRange: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, [filters]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      
      // Vérifier l'authentification admin
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.user) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userError || userData.role !== 'admin') {
        router.push('/');
        return;
      }

      // Construire la requête avec filtres
      let query = supabase
        .from('complaints')
        .select(`
          *,
          order:orders(
            id,
            order_number,
            total_amount,
            created_at
          ),
          customer:users!customer_id(
            id,
            email,
            full_name,
            telephone
          ),
          restaurant:restaurants!restaurant_id(
            id,
            nom,
            adresse
          ),
          evidence:complaint_evidence(*)
        `)
        .order('created_at', { ascending: false });

      // Appliquer les filtres
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.complaintType) {
        query = query.eq('complaint_type', filters.complaintType);
      }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur récupération réclamations:', error);
      
      // Gestion spécifique des erreurs
      if (error.message.includes('relation "complaints" does not exist')) {
        throw new Error('Table des réclamations non créée. Veuillez exécuter le script SQL.');
      } else if (error.message.includes('permission denied')) {
        throw new Error('Permissions insuffisantes. Vérifiez votre rôle admin.');
      } else if (error.message.includes('foreign key constraint')) {
        throw new Error('Erreur de contrainte de clé étrangère. Vérifiez la structure de la base.');
      } else {
        throw error;
      }
    }

      // Filtrer par terme de recherche
      let filteredData = data;
      if (searchTerm) {
        filteredData = data.filter(complaint => 
          complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          complaint.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          complaint.restaurant.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (complaint.order.order_number && complaint.order.order_number.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      setComplaints(filteredData);

    } catch (err) {
      console.error('Erreur récupération réclamations:', err);
      setError('Erreur lors du chargement des réclamations');
    } finally {
      setLoading(false);
    }
  };

  const handleComplaintAction = async (complaintId, action, amount = null, response = '') => {
    try {
      setProcessing(true);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const responseData = {
        adminDecision: action,
        status: action === 'reject' ? 'rejected' : 'approved',
        adminResponse: response
      };

      if (amount !== null) {
        responseData.finalRefundAmount = amount;
      }

      const apiResponse = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(responseData)
      });

      const result = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(result.error || 'Erreur lors du traitement');
      }

      // Rafraîchir la liste
      await fetchComplaints();
      setShowModal(false);
      setSelectedComplaint(null);

      alert(`Réclamation ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès`);

    } catch (err) {
      console.error('Erreur traitement réclamation:', err);
      alert('Erreur lors du traitement de la réclamation');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'under_review': return 'En cours d\'examen';
      case 'approved': return 'Approuvée';
      case 'rejected': return 'Rejetée';
      case 'resolved': return 'Résolue';
      default: return status;
    }
  };

  const getComplaintTypeText = (type) => {
    switch (type) {
      case 'food_quality': return 'Qualité nourriture';
      case 'delivery_issue': return 'Problème livraison';
      case 'missing_items': return 'Articles manquants';
      case 'wrong_order': return 'Mauvaise commande';
      case 'other': return 'Autre';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Chargement des réclamations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Gestion des Réclamations" 
        icon={FaExclamationTriangle}
        showBackButton={true}
        rightContent={
          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
            {complaints.filter(c => c.status === 'pending').length} en attente
          </span>
        }
      />

      <div className="container mx-auto px-4 py-8">
        {/* Filtres et recherche */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Recherche */}
            <div className="md:col-span-2">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par titre, email, restaurant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Filtre statut */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="under_review">En cours d'examen</option>
                <option value="approved">Approuvées</option>
                <option value="rejected">Rejetées</option>
                <option value="resolved">Résolues</option>
              </select>
            </div>

            {/* Filtre type */}
            <div>
              <select
                value={filters.complaintType}
                onChange={(e) => setFilters(prev => ({ ...prev, complaintType: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">Tous les types</option>
                <option value="food_quality">Qualité nourriture</option>
                <option value="delivery_issue">Problème livraison</option>
                <option value="missing_items">Articles manquants</option>
                <option value="wrong_order">Mauvaise commande</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des réclamations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Réclamations ({complaints.length})
            </h2>
          </div>

          {error && (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Erreur lors du chargement des réclamations
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{error}</p>
                    {error.includes('non créée') && (
                      <div className="mt-3">
                        <p className="font-medium">Solution :</p>
                        <ol className="list-decimal list-inside mt-1 space-y-1">
                          <li>Copier le contenu de <code className="bg-red-100 px-1 rounded">create-complaints-table.sql</code></li>
                          <li>Aller sur Supabase Dashboard → SQL Editor</li>
                          <li>Coller et exécuter le script SQL</li>
                          <li>Recharger cette page</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Réclamation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {complaints.map((complaint) => (
                  <tr key={complaint.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {complaint.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {getComplaintTypeText(complaint.complaint_type)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaUser className="text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {complaint.customer.full_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {complaint.customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaStore className="text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {complaint.restaurant.nom}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaEuroSign className="text-gray-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {complaint.requested_refund_amount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(complaint.status)}`}>
                        {getStatusText(complaint.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <FaCalendarAlt className="mr-1" />
                        {new Date(complaint.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {complaints.length === 0 && (
            <div className="text-center py-12">
              <FaExclamationTriangle className="text-gray-400 text-4xl mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Aucune réclamation trouvée</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de détail */}
      {showModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Réclamation #{selectedComplaint.id.slice(0, 8)}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedComplaint(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations de base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Informations client</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Nom:</span> {selectedComplaint.customer.full_name}</p>
                    <p><span className="font-medium">Email:</span> {selectedComplaint.customer.email}</p>
                    <p><span className="font-medium">Téléphone:</span> {selectedComplaint.customer.telephone}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Informations commande</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Restaurant:</span> {selectedComplaint.restaurant.nom}</p>
                    <p><span className="font-medium">Commande:</span> #{selectedComplaint.order.order_number || selectedComplaint.order.id}</p>
                    <p><span className="font-medium">Total:</span> {selectedComplaint.order.total_amount}€</p>
                    <p><span className="font-medium">Date:</span> {new Date(selectedComplaint.order.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </div>

              {/* Détails de la réclamation */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Détails de la réclamation</h4>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Type:</span> {getComplaintTypeText(selectedComplaint.complaint_type)}
                  </div>
                  <div>
                    <span className="font-medium">Titre:</span> {selectedComplaint.title}
                  </div>
                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      {selectedComplaint.description}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Montant demandé:</span> {selectedComplaint.requested_refund_amount}€
                  </div>
                </div>
              </div>

              {/* Preuves */}
              {selectedComplaint.evidence && selectedComplaint.evidence.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Preuves fournies</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedComplaint.evidence.map((evidence, index) => (
                      <div key={index} className="relative">
                        <img
                          src={evidence.file_url}
                          alt={`Preuve ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg">
                          {evidence.file_name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions (si en attente) */}
              {selectedComplaint.status === 'pending' && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Actions</h4>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => handleComplaintAction(selectedComplaint.id, 'approve', selectedComplaint.requested_refund_amount, 'Réclamation approuvée après examen')}
                      disabled={processing}
                      className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {processing ? <FaSpinner className="animate-spin mr-2" /> : <FaCheck className="mr-2" />}
                      Approuver et rembourser
                    </button>
                    
                    <button
                      onClick={() => {
                        const amount = prompt('Montant de remboursement partiel (€):', selectedComplaint.requested_refund_amount);
                        if (amount && !isNaN(amount) && amount > 0) {
                          const response = prompt('Commentaire admin:');
                          handleComplaintAction(selectedComplaint.id, 'partial_refund', parseFloat(amount), response || 'Remboursement partiel approuvé');
                        }
                      }}
                      disabled={processing}
                      className="flex items-center justify-center px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Remboursement partiel
                    </button>
                    
                    <button
                      onClick={() => {
                        const response = prompt('Raison du rejet:');
                        if (response) {
                          handleComplaintAction(selectedComplaint.id, 'reject', null, response);
                        }
                      }}
                      disabled={processing}
                      className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FaTimes className="mr-2" />
                      Rejeter
                    </button>
                  </div>
                </div>
              )}

              {/* Historique admin */}
              {selectedComplaint.admin_response && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Réponse admin</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedComplaint.admin_response}</p>
                    {selectedComplaint.final_refund_amount && (
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-2">
                        Montant remboursé: {selectedComplaint.final_refund_amount}€
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

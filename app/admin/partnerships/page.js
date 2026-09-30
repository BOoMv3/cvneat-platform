'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaSpinner } from 'react-icons/fa';

export default function PartnershipRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPartnershipRequests();
  }, []);

  const fetchPartnershipRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    setProcessing(true);
    setError('');
    setSuccess('');
    try {
      if (status === 'accepted') {
        const request = requests.find((r) => r.id === requestId);
        if (!request) throw new Error('Demande introuvable');

        const result = await createRestaurantFromRequest(request);
        const emailNote = result.emailSent
          ? 'Un email avec les identifiants a été envoyé au partenaire.'
          : result.emailError
            ? `Attention : email non envoyé (${result.emailError}).`
            : 'Email envoyé au partenaire (vérifiez aussi contact@cvneat.fr).';
        setSuccess(
          `✅ Partenaire validé — fiche « ${result.restaurant?.nom || request.nom} » prête à configurer. ${emailNote}`
        );
        setTimeout(() => setSuccess(''), 12000);
      } else {
        const { error: updateError } = await supabase
          .from('restaurant_requests')
          .update({ status, processed_at: new Date().toISOString() })
          .eq('id', requestId);

        if (updateError) {
          throw new Error(`Erreur lors de la mise à jour du statut: ${updateError.message}`);
        }
      }

      await fetchPartnershipRequests();
      setSelectedRequest(null);
    } catch (err) {
      console.error('Erreur complète:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setProcessing(false);
    }
  };

  const createRestaurantFromRequest = async (request) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    const response = await fetch('/api/admin/create-restaurant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        request_id: request.id,
        email: request.email,
        nom: request.nom,
        description: request.description,
        adresse: request.adresse,
        ville: request.ville,
        code_postal: request.code_postal,
        telephone: request.telephone,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la création du restaurant');
    }
    if (!data.restaurant) {
      throw new Error("Restaurant non retourné par l'API");
    }
    return data;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Acceptée';
      case 'rejected': return 'Refusée';
      default: return status;
    }
  };
  const formatDate = (dateString) => new Date(dateString).toLocaleString('fr-FR');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Demandes de partenariat</h1>
            <p className="text-gray-600 mt-2">
              {requests.filter(r => r.status === 'pending').length} demande(s) en attente
            </p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">{success}</div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Demandes récentes</h2>
              </div>
              {requests.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-4xl mb-4">🏪</div>
                  <p>Aucune demande de partenariat</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${selectedRequest?.id === request.id ? 'bg-blue-50' : ''} ${request.status === 'pending' ? 'border-l-4 border-yellow-400' : ''}`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold">{request.nom}</h3>
                          <p className="text-sm text-gray-600">{request.email}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>{getStatusText(request.status)}</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm"><span className="font-medium">Email :</span> {request.email}</p>
                        <p className="text-sm"><span className="font-medium">Téléphone :</span> {request.telephone}</p>
                        <p className="text-sm"><span className="font-medium">Date :</span> {formatDate(request.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-1">
            {selectedRequest ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Détails de la demande</h2>
                <div className="space-y-4 mb-6">
                  <div>
                    <h3 className="font-medium mb-2">Informations du restaurant</h3>
                    <p><span className="font-medium">Nom :</span> {selectedRequest.nom}</p>
                    <p><span className="font-medium">Description :</span> {selectedRequest.description || 'Aucune description'}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Contact</h3>
                    <p><span className="font-medium">Email :</span> {selectedRequest.email}</p>
                    <p><span className="font-medium">Téléphone :</span> {selectedRequest.telephone}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Adresse</h3>
                    <p>{selectedRequest.adresse}</p>
                    <p>{selectedRequest.ville} {selectedRequest.code_postal}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Date de demande</h3>
                    <p>{formatDate(selectedRequest.created_at)}</p>
                  </div>
                </div>
                {selectedRequest.status === 'pending' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => updateRequestStatus(selectedRequest.id, 'accepted')}
                      disabled={processing}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {processing ? <FaSpinner className="animate-spin mx-auto" /> : '✅ Accepter la demande'}
                    </button>
                    <button
                      onClick={() => updateRequestStatus(selectedRequest.id, 'rejected')}
                      disabled={processing}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {processing ? <FaSpinner className="animate-spin mx-auto" /> : '❌ Refuser la demande'}
                    </button>
                  </div>
                )}
                {selectedRequest.status !== 'pending' && (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${selectedRequest.status === 'accepted' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      <p className="font-medium">
                        {selectedRequest.status === 'accepted' ? 'Demande acceptée' : 'Demande refusée'}
                      </p>
                      {selectedRequest.processed_at && (
                        <p className="text-sm mt-1">
                          Traitée le {formatDate(selectedRequest.processed_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
                <div className="text-4xl mb-4">👆</div>
                <p>Sélectionnez une demande pour voir les détails</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

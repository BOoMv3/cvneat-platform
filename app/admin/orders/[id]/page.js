'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { FaArrowLeft, FaSpinner, FaEdit } from 'react-icons/fa';

export default function AdminOrderDetail() {
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('commandes')
        .update({ statut: newStatus })
        .eq('id', params.id);

      if (error) throw error;
      
      // Rafraîchir les données
      await fetchOrder();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Acceptée';
      case 'rejected': return 'Refusée';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prête';
      case 'delivered': return 'Livrée';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-gray-500">Commande non trouvée</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/orders')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft />
            </button>
            <h1 className="text-3xl font-bold">Commande #{order.id}</h1>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
            {getStatusText(order.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informations client */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Informations client</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Nom</label>
                <p className="text-gray-900">{order.customer_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Téléphone</label>
                <p className="text-gray-900">{order.customer_phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Adresse de livraison</label>
                <p className="text-gray-900">{order.delivery_address}</p>
                <p className="text-gray-900">{order.delivery_postal_code} {order.delivery_city}</p>
              </div>
              {order.delivery_instructions && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Instructions de livraison</label>
                  <p className="text-gray-900">{order.delivery_instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Détails de la commande */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Détails de la commande</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Restaurant ID</label>
                <p className="text-gray-900">{order.restaurant_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Date de création</label>
                <p className="text-gray-900">
                  {new Date(order.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Dernière mise à jour</label>
                <p className="text-gray-900">
                  {new Date(order.updated_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Total</label>
                <p className="text-2xl font-bold text-gray-900">{order.total_amount.toFixed(2)}€</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Frais de livraison</label>
                <p className="text-gray-900">{order.delivery_fee}€</p>
              </div>
            </div>
          </div>
        </div>

        {/* Articles commandés */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Articles commandés</h2>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">Quantité: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{(item.price * item.quantity).toFixed(2)}€</p>
                    <p className="text-sm text-gray-600">{item.price}€ l'unité</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Aucun article trouvé</p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {order.status === 'pending' && (
              <>
                <button
                  onClick={() => updateOrderStatus('accepted')}
                  disabled={updating}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {updating ? <FaSpinner className="animate-spin" /> : 'Accepter la commande'}
                </button>
                <button
                  onClick={() => updateOrderStatus('rejected')}
                  disabled={updating}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {updating ? <FaSpinner className="animate-spin" /> : 'Refuser la commande'}
                </button>
              </>
            )}
            {order.status === 'accepted' && (
              <button
                onClick={() => updateOrderStatus('preparing')}
                disabled={updating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {updating ? <FaSpinner className="animate-spin" /> : 'Marquer en préparation'}
              </button>
            )}
            {order.status === 'preparing' && (
              <button
                onClick={() => updateOrderStatus('ready')}
                disabled={updating}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {updating ? <FaSpinner className="animate-spin" /> : 'Marquer prête'}
              </button>
            )}
            {order.status === 'ready' && (
              <button
                onClick={() => updateOrderStatus('delivered')}
                disabled={updating}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {updating ? <FaSpinner className="animate-spin" /> : 'Marquer livrée'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
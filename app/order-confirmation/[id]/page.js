'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function OrderConfirmation() {
  const { id } = useParams();
  const router = useRouter();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrder();
    
    // Polling pour mettre à jour le statut en temps réel
    const interval = setInterval(fetchOrder, 5000); // Vérifier toutes les 5 secondes
    
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${id}`);
      if (!response.ok) {
        throw new Error('Commande non trouvée');
      }
      const data = await response.json();
      setOrderData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'En attente d\'acceptation par le restaurant';
      case 'accepted':
        return 'Commande acceptée par le restaurant';
      case 'rejected':
        return 'Commande refusée par le restaurant';
      case 'preparing':
        return 'En cours de préparation';
      case 'ready':
        return 'Prête pour la livraison';
      case 'delivered':
        return 'Livrée';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Commande non trouvée</h1>
            <p className="text-gray-600 mb-6">{error || 'Impossible de récupérer les détails de votre commande.'}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Commande confirmée !</h1>
            <p className="text-gray-600 mb-4">
              Votre commande #{orderData.id} a été reçue.
            </p>
            
            {/* Statut de la commande */}
            <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(orderData.status)}`}>
              {getStatusText(orderData.status)}
            </div>
          </div>

          {orderData.restaurants && (
            <div className="border-t border-b py-6 mb-6">
              <h2 className="text-lg font-bold mb-4">Restaurant</h2>
              <div className="space-y-2">
                <p className="font-medium">{orderData.restaurants.name}</p>
                <p className="text-gray-600">{orderData.restaurants.description}</p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-bold mb-4">Détails de livraison</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Nom :</span> {orderData.customer_name}</p>
              <p><span className="font-medium">Téléphone :</span> {orderData.customer_phone}</p>
              <p><span className="font-medium">Adresse :</span> {orderData.delivery_address}</p>
              <p><span className="font-medium">Ville :</span> {orderData.delivery_city} {orderData.delivery_postal_code}</p>
              {orderData.delivery_instructions && (
                <p><span className="font-medium">Instructions :</span> {orderData.delivery_instructions}</p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold mb-4">Récapitulatif de la commande</h2>
            <div className="space-y-4">
              {orderData.items && orderData.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                  </div>
                  <p className="font-medium">{(item.price * item.quantity).toFixed(2)}€</p>
                </div>
              ))}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span>{(orderData.total_amount - orderData.delivery_fee).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span>Frais de livraison</span>
                  <span>{orderData.delivery_fee.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{orderData.total_amount.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
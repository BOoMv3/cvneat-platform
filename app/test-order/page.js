'use client';

import { useState } from 'react';

export default function TestOrder() {
  const [orderId, setOrderId] = useState('54');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrder = async () => {
    if (!orderId.trim()) {
      setError('Veuillez entrer un numéro de commande');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erreur ${response.status}: ${errorData.error || 'Erreur inconnue'}`);
      }
      
      const data = await response.json();
      setOrder(data);
    } catch (err) {
      setError(err.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Test Commande (Sans Auth)</h1>
          
          <div className="mb-8">
            <div className="flex gap-4">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Entrez votre numéro de commande"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={fetchOrder}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
            {error && (
              <p className="text-red-600 mt-2">{error}</p>
            )}
          </div>

          {order && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Commande #{order.id}</h2>
                <p><strong>Statut:</strong> {order.status}</p>
                <p><strong>Client:</strong> {order.customer_name}</p>
                <p><strong>Code sécurité:</strong> {order.security_code || 'Non défini'}</p>
                <p><strong>Total:</strong> {order.total_amount}€</p>
                <p><strong>Frais livraison:</strong> {order.delivery_fee}€</p>
                <p><strong>Adresse:</strong> {order.delivery_address}</p>
                <p><strong>Créée le:</strong> {new Date(order.created_at).toLocaleString('fr-FR')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

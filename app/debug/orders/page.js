'use client';

import { useState, useEffect } from 'react';

export default function DebugOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des commandes');
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Debug - Toutes les commandes</h1>
        
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-500">Aucune commande trouvée dans la base de données</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Commande #{order.id}</h3>
                    <p className="text-sm text-gray-600">
                      Créée le: {new Date(order.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Informations client</h4>
                    <p><span className="font-medium">Nom:</span> {order.customer_name}</p>
                    <p><span className="font-medium">Téléphone:</span> {order.customer_phone}</p>
                    <p><span className="font-medium">Adresse:</span> {order.delivery_address}</p>
                    <p><span className="font-medium">Ville:</span> {order.delivery_city} {order.delivery_postal_code}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Détails commande</h4>
                    <p><span className="font-medium">Restaurant ID:</span> {order.restaurant_id}</p>
                    <p><span className="font-medium">Total:</span> {order.total_amount}€</p>
                    <p><span className="font-medium">Frais de livraison:</span> {order.delivery_fee}€</p>
                    <p><span className="font-medium">Articles:</span> {order.items?.length || 0}</p>
                  </div>
                </div>
                
                {order.items && order.items.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Articles commandés</h4>
                    <div className="space-y-1">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.name} x{item.quantity}</span>
                          <span>{(item.price * item.quantity).toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrderHistory() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors de la récupération des commandes');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prêt';
      case 'delivered': return 'Livré';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Historique des commandes</h1>
            <button
              onClick={() => router.push('/profile')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
            >
              <FaArrowLeft className="mr-2" />
              Retour au profil
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Commande #{order.id}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Restaurant</h4>
                  <p className="text-gray-600">{order.restaurant.name}</p>
                  <p className="text-sm text-gray-500">
                    {order.restaurant.address}, {order.restaurant.city}
                  </p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Adresse de livraison</h4>
                  <p className="text-gray-600">
                    {order.deliveryAddress}, {order.deliveryCity} {order.deliveryPostalCode}
                  </p>
                  <p className="text-gray-600">Tél: {order.deliveryPhone}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Items commandés</h4>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{item.price}€</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t pt-4">
                  <div>
                    <p className="text-sm text-gray-500">Sous-total</p>
                    <p className="text-lg font-medium">{order.totalAmount}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Frais de livraison</p>
                    <p className="text-lg font-medium">{order.deliveryFee}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-lg font-medium">{order.totalAmount + order.deliveryFee}€</p>
                  </div>
                </div>
              </div>
            ))}

            {orders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucune commande trouvée</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 
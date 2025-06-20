'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import { FaArrowLeft, FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';

export default function OrderDetail({ params }) {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, []);

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/orders/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors de la récupération de la commande');
      const data = await response.json();
      setOrder(data);
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
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-gray-500">Commande non trouvée</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Détails de la commande #{order.id}</h1>
            <button
              onClick={() => router.push('/profile/orders')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
            >
              <FaArrowLeft className="mr-2" />
              Retour aux commandes
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-lg font-medium mb-4">Restaurant</h2>
                <p className="text-gray-600">{order.restaurant.name}</p>
                <p className="text-sm text-gray-500">
                  {order.restaurant.address}, {order.restaurant.city}
                </p>
              </div>

              <div>
                <h2 className="text-lg font-medium mb-4">Adresse de livraison</h2>
                <p className="text-gray-600">
                  {order.deliveryAddress}, {order.deliveryCity} {order.deliveryPostalCode}
                </p>
                <p className="text-gray-600">Tél: {order.deliveryPhone}</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-medium mb-4">Items commandés</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                    </div>
                    <p className="font-medium">{item.price}€</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-gray-600">Sous-total</p>
                  <p>{order.totalAmount}€</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-gray-600">Frais de livraison</p>
                  <p>{order.deliveryFee}€</p>
                </div>
                <div className="flex justify-between font-medium text-lg pt-2 border-t">
                  <p>Total</p>
                  <p>{order.totalAmount + order.deliveryFee}€</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 
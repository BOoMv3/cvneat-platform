'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function RestaurantOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [newOrderNotification, setNewOrderNotification] = useState(null);

  // Pour l'exemple, on utilise un restaurant ID fixe
  // En production, cela viendrait de l'authentification
  const restaurantId = '7f1e0b5f-5552-445d-a582-306515030c8d'; // À remplacer par l'ID du restaurant connecté

  useEffect(() => {
    fetchOrders();
    setupRealtimeSubscription();
    
    // Polling pour mettre à jour les commandes en temps réel
    const interval = setInterval(fetchOrders, 10000); // Vérifier toutes les 10 secondes
    
    return () => {
      clearInterval(interval);
      // Nettoyer la subscription
      supabase.removeAllChannels();
    };
  }, []);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Nouvelle commande reçue:', payload.new);
          setNewOrderNotification(payload.new);
          fetchOrders(); // Rafraîchir la liste
          
          // Supprimer la notification après 5 secondes
          setTimeout(() => setNewOrderNotification(null), 5000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Commande mise à jour:', payload.new);
          fetchOrders(); // Rafraîchir la liste
        }
      )
      .subscribe();
  };

  const fetchOrders = async () => {
    try {
      console.log('=== RÉCUPÉRATION COMMANDES RESTAURANT ===');
      console.log('Restaurant ID utilisé:', restaurantId);
      
      const response = await fetch(`/api/restaurants/${restaurantId}/orders`);
      console.log('Statut de la réponse:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur API:', errorText);
        throw new Error('Erreur lors de la récupération des commandes');
      }
      
      const data = await response.json();
      console.log('Commandes reçues:', data);
      setOrders(data);
    } catch (err) {
      console.error('Erreur complète:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status, reason = '') => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, reason })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut');
      }

      // Rafraîchir les commandes
      await fetchOrders();
      setSelectedOrder(null);
      setRejectionReason('');
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'accepted':
        return 'Acceptée';
      case 'rejected':
        return 'Refusée';
      case 'preparing':
        return 'En préparation';
      case 'ready':
        return 'Prête';
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR');
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
      {/* Notification de nouvelle commande */}
      {newOrderNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          <div className="flex items-center">
            <span className="mr-2">🔔</span>
            <div>
              <p className="font-semibold">Nouvelle commande !</p>
              <p className="text-sm">Commande #{newOrderNotification.id} - {newOrderNotification.total_amount}€</p>
            </div>
            <button 
              onClick={() => setNewOrderNotification(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gestion des commandes</h1>
          <div className="flex space-x-4">
            <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm font-medium">En ligne</span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des commandes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Commandes récentes</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {orders.filter(o => o.status === 'pending').length} commande(s) en attente
                </p>
              </div>
              
              {orders.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <div className="text-4xl mb-4">🍕</div>
                  <p>Aucune commande pour le moment</p>
                  <p className="text-sm mt-2">Les nouvelles commandes apparaîtront ici</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                      } ${order.status === 'pending' ? 'border-l-4 border-yellow-400' : ''}`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold">Commande #{order.id}</h3>
                          <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <p><span className="font-medium">Client :</span> {order.customer_name}</p>
                        <p><span className="font-medium">Total :</span> {order.total_amount.toFixed(2)}€</p>
                        <p><span className="font-medium">Articles :</span> {order.items?.length || 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Détails de la commande sélectionnée */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Détails de la commande #{selectedOrder.id}</h2>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <h3 className="font-medium mb-2">Informations client</h3>
                    <p><span className="font-medium">Nom :</span> {selectedOrder.customer_name}</p>
                    <p><span className="font-medium">Téléphone :</span> {selectedOrder.customer_phone}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Adresse de livraison</h3>
                    <p>{selectedOrder.delivery_address}</p>
                    <p>{selectedOrder.delivery_city} {selectedOrder.delivery_postal_code}</p>
                    {selectedOrder.delivery_instructions && (
                      <p className="text-sm text-gray-600 mt-1">
                        Instructions : {selectedOrder.delivery_instructions}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Articles commandés</h3>
                    <div className="space-y-2">
                      {selectedOrder.items?.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.name} x{item.quantity}</span>
                          <span>{(item.price * item.quantity).toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t mt-2 pt-2">
                      <div className="flex justify-between">
                        <span>Frais de livraison</span>
                        <span>{selectedOrder.delivery_fee.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>{selectedOrder.total_amount.toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions selon le statut */}
                {selectedOrder.status === 'pending' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'accepted')}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      ✅ Accepter la commande
                    </button>
                    
                    <div>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Raison du refus (optionnel)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        rows="3"
                      />
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'rejected', rejectionReason)}
                        className="w-full mt-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        ❌ Refuser la commande
                      </button>
                    </div>
                  </div>
                )}

                {selectedOrder.status === 'accepted' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      👨‍🍳 Commencer la préparation
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'preparing' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      📦 Marquer comme prête
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'ready' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                      className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      🚚 Marquer comme livrée
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
                <div className="text-4xl mb-4">👆</div>
                <p>Sélectionnez une commande pour voir les détails</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
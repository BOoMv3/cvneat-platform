'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function TrackOrderAdmin() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const fetchOrder = async () => {
    if (!orderId.trim()) {
      setError('Veuillez entrer un numéro de commande');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Récupération commande admin:', orderId);
      
      // Récupérer la commande directement (sans vérification d'appartenance)
      const response = await fetch(`/api/debug/orders`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des commandes');
      }
      
      const result = await response.json();
      const orders = result.orders || [];
      const data = orders.find(o => o.id == orderId);
      
      if (!data) {
        throw new Error('Commande non trouvée');
      }
      
      console.log('✅ Commande trouvée:', data);
      setOrder(data);
      
      // Simuler des notifications basées sur le statut
      generateNotifications(data);
    } catch (err) {
      console.error('❌ Erreur fetchOrder:', err);
      setError(err.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const generateNotifications = (orderData) => {
    const notifs = [];
    const now = new Date();
    
    // Notification de création
    notifs.push({
      id: 1,
      title: 'Commande créée',
      message: `Commande #${orderData.id} créée avec succès`,
      time: new Date(orderData.created_at),
      status: 'completed',
      icon: '📝'
    });

    // Notification d'acceptation
    if (['accepted', 'preparing', 'ready', 'delivered'].includes(orderData.status)) {
      notifs.push({
        id: 2,
        title: 'Commande acceptée',
        message: `Le restaurant a accepté la commande. Temps de préparation estimé : ${orderData.preparation_time || 30} minutes`,
        time: new Date(orderData.updated_at),
        status: 'completed',
        icon: '✅'
      });
    }

    // Notification de préparation
    if (['preparing', 'ready', 'delivered'].includes(orderData.status)) {
      notifs.push({
        id: 3,
        title: 'Préparation en cours',
        message: 'La commande est en cours de préparation',
        time: new Date(orderData.updated_at),
        status: 'completed',
        icon: '👨‍🍳'
      });
    }

    // Notification prête
    if (['ready', 'delivered'].includes(orderData.status)) {
      notifs.push({
        id: 4,
        title: 'Commande prête',
        message: 'La commande est prête ! Un livreur va bientôt la récupérer',
        time: new Date(orderData.updated_at),
        status: 'completed',
        icon: '📦'
      });
    }

    // Notification en cours de livraison
    if (orderData.status === 'delivered' && orderData.delivery_id) {
      notifs.push({
        id: 5,
        title: 'En cours de livraison',
        message: 'La commande est en cours de livraison',
        time: new Date(orderData.updated_at),
        status: 'completed',
        icon: '🚚'
      });
    }

    // Notification livrée
    if (orderData.status === 'delivered') {
      notifs.push({
        id: 6,
        title: 'Commande livrée',
        message: 'La commande a été livrée avec succès !',
        time: new Date(orderData.updated_at),
        status: 'completed',
        icon: '🎉'
      });
    }

    setNotifications(notifs);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h1 className="text-2xl font-bold text-yellow-800 mb-2">🔧 Mode Admin - Suivi de commande</h1>
            <p className="text-yellow-700">Cette page permet de tester le suivi de commande sans authentification (pour les tests admin).</p>
          </div>
          
          {/* Formulaire de recherche */}
          <div className="mb-8">
            <div className="flex gap-4">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Entrez votre numéro de commande (ex: 54)"
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

          {/* Affichage de la commande */}
          {order && (
            <div className="space-y-6">
              {/* Informations de base */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Commande #{order.id}</h2>
                    <p className="text-gray-600">Créée le {formatDate(order.created_at)}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>

                {/* Code de sécurité */}
                {order.security_code && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-800">🔐 Code de sécurité</h3>
                        <p className="text-sm text-blue-600">Code à donner au livreur pour récupérer la commande</p>
                      </div>
                      <div className="text-3xl font-mono font-bold text-blue-800 bg-white px-4 py-2 rounded-lg border-2 border-blue-300">
                        {order.security_code}
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-green-800">💬 Chat</h3>
                      <p className="text-sm text-green-600">Communiquez avec le client/livreur</p>
                    </div>
                    <a
                      href={`/chat/${order.id}`}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Ouvrir le chat
                    </a>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Informations client</h3>
                    <p><span className="font-medium">Nom :</span> {order.customer_name}</p>
                    <p><span className="font-medium">Téléphone :</span> {order.customer_phone}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Adresse de livraison</h3>
                    <p>{order.delivery_address}</p>
                    <p>{order.delivery_city} {order.delivery_postal_code}</p>
                    {order.delivery_instructions && (
                      <p className="text-sm text-gray-600 mt-1">
                        Instructions : {order.delivery_instructions}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Articles commandés */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold mb-4">Articles commandés</h3>
                <div className="space-y-2">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.name} x{item.quantity}</span>
                      <span>{(item.price * item.quantity).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Sous-total</span>
                    <span>{order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Frais de livraison</span>
                    <span>{order.delivery_fee.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>{(order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) + order.delivery_fee).toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {/* Timeline des notifications */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold mb-4">Suivi de la commande</h3>
                <div className="space-y-4">
                  {notifications.map((notif, index) => (
                    <div key={notif.id} className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">{notif.icon}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">{notif.title}</h4>
                          <span className="text-sm text-gray-500">{formatDate(notif.time)}</span>
                        </div>
                        <p className="text-gray-600 text-sm mt-1">{notif.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message d'aide */}
          {!order && (
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">🔧</div>
              <p className="text-lg">Mode admin - Entrez un numéro de commande pour tester</p>
              <p className="text-sm mt-2">Cette page permet de voir toutes les commandes sans authentification</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

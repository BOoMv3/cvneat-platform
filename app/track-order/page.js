'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [lastStatus, setLastStatus] = useState(null);

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
        throw new Error('Commande non trouvée');
      }
      
      const data = await response.json();
      setOrder(data);
      setLastStatus(data.status);
      
      // Simuler des notifications basées sur le statut
      generateNotifications(data);
      
      // Démarrer le suivi automatique si la commande n'est pas livrée
      if (data.status !== 'delivered' && data.status !== 'rejected') {
        setIsTracking(true);
      }
    } catch (err) {
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
      message: `Votre commande #${orderData.id} a été créée avec succès`,
      time: new Date(orderData.created_at),
      status: 'completed',
      icon: '📝'
    });

    // Notification d'acceptation
    if (['accepted', 'preparing', 'ready', 'delivered'].includes(orderData.status)) {
      notifs.push({
        id: 2,
        title: 'Commande acceptée',
        message: `Le restaurant a accepté votre commande. Temps de préparation estimé : ${orderData.preparation_time || 30} minutes`,
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
        message: 'Votre commande est en cours de préparation',
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
        message: 'Votre commande est prête ! Un livreur va bientôt la récupérer',
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
        message: 'Votre commande est en cours de livraison',
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
        message: 'Votre commande a été livrée avec succès ! Bon appétit !',
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

  // Polling automatique pour suivre les changements de statut
  useEffect(() => {
    if (!isTracking || !orderId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (response.ok) {
          const data = await response.json();
          
          // Vérifier si le statut a changé
          if (data.status !== lastStatus) {
            console.log('🔄 Statut changé:', lastStatus, '→', data.status);
            setOrder(data);
            setLastStatus(data.status);
            generateNotifications(data);
            
            // Afficher une notification du navigateur
            if (Notification.permission === 'granted') {
              const statusMessages = {
                'accepted': 'Votre commande a été acceptée !',
                'preparing': 'Votre commande est en cours de préparation',
                'ready': 'Votre commande est prête !',
                'delivered': 'Votre commande a été livrée !'
              };
              
              new Notification('CVN\'EAT - Mise à jour commande', {
                body: statusMessages[data.status] || 'Statut de votre commande mis à jour',
                icon: '/favicon.ico'
              });
            }
            
            // Arrêter le suivi si la commande est terminée
            if (data.status === 'delivered' || data.status === 'rejected') {
              setIsTracking(false);
            }
          }
        }
      } catch (error) {
        console.error('Erreur polling:', error);
      }
    }, 5000); // Vérifier toutes les 5 secondes

    return () => clearInterval(interval);
  }, [isTracking, orderId, lastStatus]);

  // Demander la permission pour les notifications
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Suivi de commande</h1>
          
          {/* Formulaire de recherche */}
          <div className="mb-8">
            <div className="flex gap-4">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Entrez votre numéro de commande (ex: 52)"
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Suivi de votre commande</h3>
                  {isTracking && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Suivi en temps réel</span>
                    </div>
                  )}
                </div>
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
              <div className="text-6xl mb-4">📱</div>
              <p className="text-lg">Entrez votre numéro de commande pour suivre votre livraison</p>
              <p className="text-sm mt-2">Vous recevrez des notifications en temps réel sur l'avancement</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

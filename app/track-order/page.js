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
      // Vérifier si l'utilisateur est connecté
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Vous devez être connecté pour suivre une commande. Veuillez vous connecter d\'abord.');
        setLoading(false);
        return;
      }

      console.log('🔑 Session trouvée:', !!session);
      console.log('👤 Token:', session.access_token ? 'Présent' : 'Manquant');

      // Récupérer les informations de l'utilisateur
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ Erreur utilisateur:', userError);
        setError('Erreur d\'authentification. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      console.log('✅ Utilisateur connecté:', user.email);
      
      // Récupérer la commande avec vérification d'appartenance
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Réponse API:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Erreur API:', errorData);
        
        if (response.status === 404) {
          throw new Error('Commande non trouvée');
        } else if (response.status === 403) {
          throw new Error('Vous n\'êtes pas autorisé à voir cette commande. Vérifiez que le nom de la commande correspond à votre nom d\'utilisateur.');
        } else if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        } else {
          throw new Error(`Erreur serveur (${response.status}): ${errorData.error || 'Erreur inconnue'}`);
        }
      }
      
      const data = await response.json();
      console.log('✅ Commande récupérée:', data);
      
      setOrder(data);
      setLastStatus(data.status);
      
      // Simuler des notifications basées sur le statut
      generateNotifications(data);
      
      // Démarrer le suivi automatique si la commande n'est pas livrée
      if (data.status !== 'delivered' && data.status !== 'rejected') {
        setIsTracking(true);
      }
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
        // Récupérer la session pour le token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsTracking(false);
          return;
        }

        const response = await fetch(`/api/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
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
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-6 sm:mb-8">Suivi de commande</h1>
          
          {/* Formulaire de recherche */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Entrez votre numéro de commande (ex: 52)"
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation text-sm sm:text-base"
              />
              <button
                onClick={fetchOrder}
                disabled={loading}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap min-h-[44px] touch-manipulation text-sm sm:text-base"
              >
                {loading ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
            {error && (
              <p className="text-red-600 mt-2 text-sm sm:text-base">{error}</p>
            )}
          </div>

          {/* Affichage de la commande */}
          {order && (
            <div className="space-y-4 sm:space-y-6">
              {/* Informations de base */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                  <div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold">Commande #{order.id}</h2>
                    <p className="text-sm sm:text-base text-gray-600">Créée le {formatDate(order.created_at)}</p>
                  </div>
                  <span className={`px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>

                {/* Code de sécurité */}
                {order.security_code && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div>
                        <h3 className="font-semibold text-blue-800 text-sm sm:text-base">🔐 Code de sécurité</h3>
                        <p className="text-xs sm:text-sm text-blue-600">Donnez ce code au livreur pour récupérer votre commande</p>
                      </div>
                      <div className="text-2xl sm:text-3xl font-mono font-bold text-blue-800 bg-white px-3 sm:px-4 py-2 rounded-lg border-2 border-blue-300 text-center">
                        {order.security_code}
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div>
                      <h3 className="font-semibold text-green-800 text-sm sm:text-base">💬 Chat</h3>
                      <p className="text-xs sm:text-sm text-green-600">Communiquez avec le restaurant/livreur</p>
                    </div>
                    <a
                      href={`/chat/${order.id}`}
                      className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-h-[44px] touch-manipulation text-sm sm:text-base text-center"
                    >
                      Ouvrir le chat
                    </a>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">Informations client</h3>
                    <p className="text-xs sm:text-sm"><span className="font-medium">Nom :</span> {order.customer_name}</p>
                    <p className="text-xs sm:text-sm"><span className="font-medium">Téléphone :</span> {order.customer_phone}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base">Adresse de livraison</h3>
                    <p className="text-xs sm:text-sm">{order.delivery_address}</p>
                    <p className="text-xs sm:text-sm">{order.delivery_city} {order.delivery_postal_code}</p>
                    {order.delivery_instructions && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Instructions : {order.delivery_instructions}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Articles commandés */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Articles commandés</h3>
                <div className="space-y-1 sm:space-y-2">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex justify-between text-xs sm:text-sm">
                      <span className="truncate flex-1 min-w-0">{item.name} x{item.quantity}</span>
                      <span className="ml-2">{(item.price * item.quantity).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-3 sm:mt-4 pt-3 sm:pt-4">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                    <span>Sous-total</span>
                    <span>{order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                    <span>Frais de livraison</span>
                    <span>{order.delivery_fee.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm sm:text-base lg:text-lg border-t pt-2">
                    <span>Total</span>
                    <span>{(order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) + order.delivery_fee).toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {/* Timeline des notifications */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                  <h3 className="font-semibold text-sm sm:text-base">Suivi de votre commande</h3>
                  {isTracking && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs sm:text-sm font-medium">Suivi en temps réel</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {notifications.map((notif, index) => (
                    <div key={notif.id} className="flex items-start space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm sm:text-lg">{notif.icon}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-1 sm:space-y-0">
                          <h4 className="font-medium text-sm sm:text-base">{notif.title}</h4>
                          <span className="text-xs sm:text-sm text-gray-500">{formatDate(notif.time)}</span>
                        </div>
                        <p className="text-gray-600 text-xs sm:text-sm mt-1">{notif.message}</p>
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
              <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📱</div>
              <p className="text-base sm:text-lg">Entrez votre numéro de commande pour suivre votre livraison</p>
              <p className="text-xs sm:text-sm mt-2">Vous recevrez des notifications en temps réel sur l'avancement</p>
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>🔒 Sécurité :</strong> Vous devez être connecté pour suivre une commande. 
                  Vous ne pouvez voir que vos propres commandes.
                </p>
                <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-center sm:items-center">
                  <a 
                    href="/login" 
                    className="inline-block bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] touch-manipulation text-sm sm:text-base"
                  >
                    Se connecter
                  </a>
                  <span className="mx-2 text-gray-400 text-sm">ou</span>
                  <a 
                    href="/register" 
                    className="inline-block bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition-colors min-h-[44px] touch-manipulation text-sm sm:text-base"
                  >
                    S'inscrire
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

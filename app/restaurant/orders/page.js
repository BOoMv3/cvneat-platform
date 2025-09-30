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
  const [preparationTime, setPreparationTime] = useState(30);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Pour l'exemple, on utilise un restaurant ID fixe
  // En production, cela viendrait de l'authentification
  const [restaurantId, setRestaurantId] = useState(null);
  
  // DEBUG: Afficher toutes les commandes pour diagnostiquer
  const [showAllOrders, setShowAllOrders] = useState(false);

  useEffect(() => {
    // Charger les commandes au démarrage
    fetchOrders();
    
    if (!showAllOrders) {
      setupRealtimeSubscription();
    }
    
    return () => {
      // Nettoyer la subscription
      supabase.removeAllChannels();
    };
  }, [showAllOrders]);

  // Polling séparé pour éviter les conflits
  useEffect(() => {
    if (showAllOrders) return; // Pas de polling en mode debug
    
    const interval = setInterval(() => {
      console.log('🔄 Polling automatique des commandes');
      fetchOrders();
    }, 15000); // Vérifier toutes les 15 secondes
    
    return () => clearInterval(interval);
  }, [showAllOrders]);

  // Effet séparé pour gérer les changements de showAllOrders
  useEffect(() => {
    if (showAllOrders) {
      // En mode debug, nettoyer les subscriptions
      supabase.removeAllChannels();
      console.log('🔍 Mode debug activé - subscriptions désactivées');
    } else {
      // En mode normal, réactiver les subscriptions
      setupRealtimeSubscription();
      console.log('🔍 Mode normal activé - subscriptions réactivées');
    }
  }, [showAllOrders]);

  // Fonction pour jouer un son de notification
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Erreur lecture audio:', error);
    }
  };

  // Demander la permission pour les notifications
  const requestNotificationPermission = async () => {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'commandes',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Nouvelle commande reçue:', payload.new);
          setNewOrderNotification(payload.new);
          fetchOrders(); // Rafraîchir la liste
          
          // Alerte sonore
          if (audioEnabled) {
            playNotificationSound();
          }
          
          // Notification du navigateur
          if (Notification.permission === 'granted') {
            new Notification('Nouvelle commande !', {
              body: `Commande de ${payload.new.user_id} - ${payload.new.total}€`,
              icon: '/favicon.ico'
            });
          }
          
          // Supprimer la notification après 5 secondes
          setTimeout(() => setNewOrderNotification(null), 5000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'commandes',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Commande mise à jour:', payload.new);
          console.log('Ancien statut:', payload.old.statut);
          console.log('Nouveau statut:', payload.new.statut);
          fetchOrders(); // Rafraîchir la liste
        }
      )
      .subscribe((status) => {
        console.log('🔔 Statut de la subscription:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erreur de subscription, retry dans 5s...');
          setTimeout(() => {
            if (!showAllOrders) {
              setupRealtimeSubscription();
            }
          }, 5000);
        }
      });
  };

  const fetchOrders = async () => {
    try {
      console.log('=== RÉCUPÉRATION COMMANDES RESTAURANT ===');
      
      // Si mode debug, récupérer toutes les commandes
      if (showAllOrders) {
        console.log('Mode debug activé - récupération de toutes les commandes');
        const response = await fetch('/api/debug/orders');
        const data = await response.json();
        console.log('Commandes reçues (debug):', data);
        setOrders(data);
        return;
      }
      
      // Récupérer l'utilisateur connecté
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Erreur utilisateur:', userError);
        throw new Error('Utilisateur non connecté');
      }
      
      console.log('Utilisateur connecté:', user.email);
      
      // Récupérer le restaurant de l'utilisateur
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (restaurantError || !restaurant) {
        console.error('Erreur restaurant:', restaurantError);
        throw new Error('Restaurant non trouvé');
      }
      
      console.log('Restaurant trouvé:', restaurant.id);
      
      // Mettre à jour l'ID du restaurant pour les subscriptions
      setRestaurantId(restaurant.id);
      
      // Récupérer les commandes du restaurant
      const response = await fetch(`/api/restaurants/${restaurant.id}/orders`);
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

  const updateOrderStatus = async (orderId, status, reason = '', prepTime = null) => {
    try {
      console.log('🔄 Mise à jour statut commande:', { orderId, status, reason, prepTime });
      
      // Récupérer le token d'authentification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔑 Session:', session ? 'Trouvée' : 'Non trouvée');
      console.log('🔑 Erreur session:', sessionError);
      
      if (!session?.access_token) {
        console.error('❌ Pas de token d\'authentification');
        throw new Error('Pas de token d\'authentification');
      }

      const body = { status, reason };
      if (prepTime !== null) {
        body.preparation_time = prepTime;
      }

      console.log('📤 Envoi requête:', { orderId, body });

      const response = await fetch(`/api/restaurants/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      });

      console.log('📥 Réponse reçue:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erreur API:', errorData);
        throw new Error(`Erreur ${response.status}: ${errorData.error || 'Erreur inconnue'}`);
      }

      // Mettre à jour la commande localement au lieu de recharger
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: status, preparation_time: prepTime || order.preparation_time }
            : order
        )
      );
      
      setSelectedOrder(null);
      setRejectionReason('');
      setPreparationTime(30);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'en_attente':
        return 'En attente';
      case 'acceptee':
        return 'Acceptée';
      case 'refusee':
        return 'Refusée';
      case 'en_preparation':
        return 'En préparation';
      case 'pret_a_livrer':
        return 'Prête';
      case 'livree':
        return 'Livrée';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800';
      case 'acceptee':
        return 'bg-green-100 text-green-800';
      case 'refusee':
        return 'bg-red-100 text-red-800';
      case 'en_preparation':
        return 'bg-blue-100 text-blue-800';
      case 'pret_a_livrer':
        return 'bg-purple-100 text-purple-800';
      case 'livree':
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

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Gestion des commandes</h1>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm font-medium">En ligne</span>
            </div>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                audioEnabled 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              {audioEnabled ? '🔊 Audio' : '🔇 Audio'}
            </button>
            <button
              onClick={() => {
                console.log('🔄 Bouton cliqué ! showAllOrders avant:', showAllOrders);
                setShowAllOrders(!showAllOrders);
                console.log('🔄 showAllOrders après:', !showAllOrders);
                // Attendre que l'état soit mis à jour
                setTimeout(() => {
                  console.log('🔄 fetchOrders appelé avec showAllOrders:', !showAllOrders);
                  fetchOrders();
                }, 100);
              }}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                showAllOrders 
                  ? 'bg-orange-600 text-white hover:bg-orange-700' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {showAllOrders ? '🔍 Debug' : '🔍 Toutes'}
            </button>
            <button
              onClick={requestNotificationPermission}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔔 Notif
            </button>
            <button
              onClick={() => {
                console.log('🧪 TEST: Récupération directe de toutes les commandes');
                fetch('/api/debug/orders')
                  .then(response => response.json())
                  .then(data => {
                    console.log('🧪 TEST: Commandes reçues:', data);
                    setOrders(data);
                  })
                  .catch(error => console.error('🧪 TEST: Erreur:', error));
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              🧪 TEST DIRECT
            </button>
            {showAllOrders && (
              <button
                onClick={() => {
                  console.log('🔄 Rafraîchissement forcé en mode debug');
                  fetchOrders();
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                🔄 Rafraîchir
              </button>
            )}
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
                      } ${order.statut === 'en_attente' ? 'border-l-4 border-yellow-400' : ''}`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold">Commande #{order.id}</h3>
                          <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.statut)}`}>
                          {getStatusText(order.statut)}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <p><span className="font-medium">Client :</span> {order.user?.nom || 'Client anonyme'}</p>
                        <p><span className="font-medium">Total :</span> {order.total.toFixed(2)}€</p>
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
                    <p><span className="font-medium">Nom :</span> {selectedOrder.user?.nom || 'Client anonyme'}</p>
                    <p><span className="font-medium">Téléphone :</span> {selectedOrder.user?.telephone || 'Non disponible'}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Adresse de livraison</h3>
                    <p>{selectedOrder.adresse_livraison}</p>
                    <p>{selectedOrder.ville || 'Ville non spécifiée'} {selectedOrder.code_postal || ''}</p>
                    {selectedOrder.instructions && (
                      <p className="text-sm text-gray-600 mt-1">
                        Instructions : {selectedOrder.instructions}
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
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Sous-total</span>
                        <span>{selectedOrder.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2) || '0.00'}€</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Frais de livraison</span>
                        <span>{selectedOrder.delivery_fee.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total</span>
                        <span>{(selectedOrder.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) + selectedOrder.delivery_fee).toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions selon le statut */}
                {selectedOrder.status === 'pending' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temps de préparation estimé (minutes)
                      </label>
                      <input
                        type="number"
                        value={preparationTime}
                        onChange={(e) => setPreparationTime(parseInt(e.target.value) || 30)}
                        min="5"
                        max="120"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="30"
                      />
                    </div>
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'accepted', '', preparationTime)}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      ✅ Accepter la commande ({preparationTime} min)
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

                {selectedOrder.status === 'accepted' && !selectedOrder.delivery_id && (
                  <div className="space-y-2">
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      👨‍🍳 Commencer la préparation
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'accepted' && selectedOrder.delivery_id && (
                  <div className="space-y-2">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                      <p className="text-orange-800 font-medium">Commande acceptée par un livreur !</p>
                      <p className="text-sm text-orange-600 mt-1">
                        La commande est en cours de livraison. Vous ne pouvez plus la modifier.
                      </p>
                    </div>
                  </div>
                )}

                {selectedOrder.status === 'preparing' && !selectedOrder.delivery_id && (
                  <div className="space-y-2">
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      📦 Marquer comme prête
                    </button>
                  </div>
                )}

                {selectedOrder.status === 'ready' && !selectedOrder.delivery_id && (
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <p className="text-blue-800 font-medium">Commande prête !</p>
                      <p className="text-sm text-blue-600 mt-1">
                        En attente qu'un livreur accepte et livre la commande
                      </p>
                    </div>
                  </div>
                )}

                {selectedOrder.status === 'ready' && selectedOrder.delivery_id && (
                  <div className="space-y-2">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-green-800 font-medium">Commande acceptée par un livreur !</p>
                      <p className="text-sm text-green-600 mt-1">
                        La commande est en cours de livraison. Vous ne pouvez plus la modifier.
                      </p>
                    </div>
                  </div>
                )}

                {selectedOrder.status === 'accepted' && selectedOrder.delivery_id && (
                  <div className="space-y-2">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                      <p className="text-orange-800 font-medium">Commande acceptée par un livreur !</p>
                      <p className="text-sm text-orange-600 mt-1">
                        La commande est en cours de livraison. Vous ne pouvez plus la modifier.
                      </p>
                    </div>
                  </div>
                )}

                {selectedOrder.status === 'preparing' && selectedOrder.delivery_id && (
                  <div className="space-y-2">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                      <p className="text-orange-800 font-medium">Commande acceptée par un livreur !</p>
                      <p className="text-sm text-orange-600 mt-1">
                        La commande est en cours de livraison. Vous ne pouvez plus la modifier.
                      </p>
                    </div>
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
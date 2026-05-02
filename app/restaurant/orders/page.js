'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { buildOrderReceiptText, printWithRawBt } from '../../../lib/rawbt-print';

export default function RestaurantOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [newOrderNotification, setNewOrderNotification] = useState(null);
  const [cancelOrderNotification, setCancelOrderNotification] = useState(null);
  const [preparationTime, setPreparationTime] = useState(30);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioEnabledRef = useRef(audioEnabled);
  const [formulaItemsCache, setFormulaItemsCache] = useState({}); // Cache pour les formula_items

  // Mettre à jour la ref quand audioEnabled change
  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  // Pour l'exemple, on utilise un restaurant ID fixe
  // En production, cela viendrait de l'authentification
  const [restaurantId, setRestaurantId] = useState(null);
  
  useEffect(() => {
    // Charger les commandes au démarrage
    fetchOrders();
    
    return () => {
      // Nettoyer la subscription
      supabase.removeAllChannels();
    };
  }, []);

  // Démarrer les subscriptions quand restaurantId est défini
  useEffect(() => {
    if (restaurantId) {
      console.log('🏪 Restaurant ID défini, démarrage des subscriptions:', restaurantId);
      setupRealtimeSubscription();
    }
    
    return () => {
      if (restaurantId) {
        console.log('🏪 Nettoyage des subscriptions pour restaurant:', restaurantId);
        supabase.removeAllChannels();
      }
    };
  }, [restaurantId]);

  // Polling toutes les 30 s (limite charge serveur)
  useEffect(() => {
    const interval = setInterval(() => {
      // TOUJOURS rafraîchir les commandes, indépendamment du son
      // C'est crucial pour que le partenaire voie les nouvelles commandes
      fetchOrders();
      // Jouer un son discret pour indiquer le rafraîchissement (si audio activé)
      // Utiliser la ref pour accéder à la valeur actuelle
      if (audioEnabledRef.current) {
        playNotificationSound().catch(err => console.warn('Erreur son rafraîchissement:', err));
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []); // Pas de dépendance pour éviter de recréer l'interval à chaque changement

  // Récupérer les formula_items pour les formules qui ont un formula_id
  useEffect(() => {
    const fetchFormulaItems = async () => {
      if (!selectedOrder || !selectedOrder.details_commande) return;
      
      const formulaIds = new Set();
      selectedOrder.details_commande.forEach(item => {
        let customizations = {};
        if (item.customizations) {
          if (typeof item.customizations === 'string') {
            try {
              customizations = JSON.parse(item.customizations);
            } catch (e) {
              customizations = {};
            }
          } else {
            customizations = item.customizations;
          }
        }
        
        const formulaId = customizations.formula_id;
        if (formulaId && customizations.is_formula === true) {
          formulaIds.add(formulaId);
        }
      });
      
      if (formulaIds.size === 0) return;
      
      // Récupérer les formula_items pour chaque formule
      const cache = {};
      for (const formulaId of formulaIds) {
        if (formulaItemsCache[formulaId]) {
          cache[formulaId] = formulaItemsCache[formulaId];
          continue;
        }
        
        try {
          const { data: formulaItems, error } = await supabase
            .from('formula_items')
            .select(`
              id,
              order_index,
              quantity,
              menu:menus(
                id,
                nom,
                prix
              )
            `)
            .eq('formula_id', formulaId)
            .order('order_index');
          
          if (!error && formulaItems) {
            cache[formulaId] = formulaItems.map(fi => ({
              name: fi.menu?.nom || 'Article',
              price: fi.menu?.prix || 0,
              quantity: fi.quantity || 1
            }));
          }
        } catch (err) {
          console.error('Erreur récupération formula_items:', err);
        }
      }
      
      if (Object.keys(cache).length > 0) {
        setFormulaItemsCache(prev => ({ ...prev, ...cache }));
      }
    };
    
    fetchFormulaItems();
  }, [selectedOrder, formulaItemsCache]);

  // Fonction pour jouer un son de notification
  const playNotificationSound = async () => {
    if (!audioEnabledRef.current) {
      return;
    }
    
    try {
      let audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // IMPORTANT: Résumer l'AudioContext s'il est suspendu (requis par les navigateurs modernes)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
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
          // NOUVEAU WORKFLOW: on n'alerte le restaurant qu'après acceptation par un livreur.
          // (livreur_id non-null). Les commandes peuvent être créées avant acceptation.
          if (!payload.new.livreur_id) {
            console.log('ℹ️ Nouvelle commande sans livreur (ignorée pour le resto):', payload.new.id);
            return;
          }
          
          setNewOrderNotification(payload.new);
          // TOUJOURS rafraîchir la liste, même si le son est désactivé
          fetchOrders();
          
          // Forcer l'alerte sonore pour les nouvelles commandes (important pour la visibilité)
          // Le son est nécessaire pour que le partenaire voie les nouvelles commandes
          playNotificationSound().catch(err => console.warn('Erreur son nouvelle commande:', err));
          
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

          // NOUVEAU WORKFLOW: alerte dès qu'un livreur accepte (livreur_id devient non-null)
          try {
            const newLivreur = payload?.new?.livreur_id || null;
            const oldLivreur = payload?.old?.livreur_id || null;
            if (newLivreur && !oldLivreur) {
              console.log('✅ Livreur assigné (UPDATE), alerte partenaire:', payload.new?.id, newLivreur);
              setNewOrderNotification(payload.new);
              playNotificationSound().catch(() => {});
              setTimeout(() => setNewOrderNotification(null), 5000);
            }
          } catch {
            // ignore
          }

          // TOUJOURS rafraîchir la liste lors des mises à jour
          fetchOrders();
          // ALERTE FORTE si la commande est annulée (client/admin)
          if (payload.new.statut === 'annulee' && payload.old?.statut !== 'annulee') {
            setCancelOrderNotification(payload.new);
            // Forcer l'alerte sonore (même si audio désactivé côté UI, c'est critique)
            playNotificationSound().catch(err => console.warn('Erreur son annulation:', err));
            if (Notification.permission === 'granted') {
              new Notification('Commande annulée', {
                body: `Commande #${payload.new.id?.slice(0, 8)} annulée par le client`,
                icon: '/favicon.ico'
              });
            }
            setTimeout(() => setCancelOrderNotification(null), 8000);
          } else {
            // Son pour mises à jour importantes
            if (audioEnabled && (payload.new.statut === 'en_preparation' || payload.new.statut === 'pret_a_livrer')) {
              playNotificationSound().catch(err => console.warn('Erreur son mise à jour:', err));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Statut de la subscription:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erreur de subscription, retry dans 5s...');
          setTimeout(() => {
            setupRealtimeSubscription();
          }, 5000);
        }
      });
  };

  const fetchOrders = async () => {
    try {
      console.log('=== RÉCUPÉRATION COMMANDES RESTAURANT ===');
      
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
      
      // Récupérer les commandes du restaurant via l'API partenaire
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non trouvée');
      }
      
      const response = await fetch('/api/partner/orders', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
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

      // Recharger les commandes pour avoir les détails complets
      await fetchOrders();
      
      // Si une commande était sélectionnée, la recharger depuis la liste mise à jour
      if (orderId) {
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession) {
          try {
            // Recharger les détails de la commande depuis l'API partenaire
            const orderResponse = await fetch('/api/partner/orders', {
              headers: { 'Authorization': `Bearer ${newSession.access_token}` }
            });
            if (orderResponse.ok) {
              const updatedOrders = await orderResponse.json();
              const updatedOrder = updatedOrders.find(o => o.id === orderId);
              if (updatedOrder) {
                setSelectedOrder(updatedOrder);
              }
            }
          } catch (err) {
            console.warn('Erreur lors du rechargement des détails:', err);
            setSelectedOrder(null);
          }
        }
      } else {
        setSelectedOrder(null);
      }
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
      case 'annulee':
        return 'Annulée';
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
      case 'annulee':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const getOrderItemsForPrint = (order) => {
    if (!order) return [];
    if (Array.isArray(order.details_commande) && order.details_commande.length > 0) {
      return order.details_commande.map((item) => ({
        name: item?.menus?.nom || item?.name || 'Article',
        quantity: Number(item?.quantite || item?.quantity || 1),
        price: Number(item?.prix_unitaire || item?.prix || item?.menus?.prix || 0),
      }));
    }
    if (Array.isArray(order.items) && order.items.length > 0) {
      return order.items.map((item) => ({
        name: item?.name || item?.nom || 'Article',
        quantity: Number(item?.quantity || item?.quantite || 1),
        price: Number(item?.price || item?.prix || 0),
      }));
    }
    return [];
  };

  const getOrderSubtotalForPrint = (order) => {
    const items = getOrderItemsForPrint(order);
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handlePrintOrder = async (order) => {
    try {
      const items = getOrderItemsForPrint(order);
      const subtotal = getOrderSubtotalForPrint(order);
      const deliveryFee = Number(order?.frais_livraison || 0);
      const total = subtotal + deliveryFee;
      const ticket = buildOrderReceiptText(order, {
        items,
        subtotal,
        deliveryFee,
        total,
      });
      const launched = await printWithRawBt(ticket);
      if (!launched) {
        throw new Error("Impossible d'ouvrir RawBT");
      }
    } catch (err) {
      setError("Impression impossible. Installez/ouvrez RawBT puis reessayez.");
      console.error('Erreur impression ticket:', err);
    }
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

      {/* Notification d'annulation de commande */}
      {cancelOrderNotification && (
        <div className="fixed top-4 left-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          <div className="flex items-center">
            <span className="mr-2">🚫</span>
            <div>
              <p className="font-semibold">Commande annulée</p>
              <p className="text-sm">
                Commande #{cancelOrderNotification.id?.slice(0, 8)} annulée par le client
              </p>
            </div>
            <button
              onClick={() => setCancelOrderNotification(null)}
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
              onClick={requestNotificationPermission}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔔 Notif
            </button>
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
                      onClick={async () => {
                        setSelectedOrder(order);
                        // Recharger les détails complets de la commande depuis l'API si nécessaire
                        if (order && (!order.details_commande || order.details_commande.length === 0)) {
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session) {
                              const orderResponse = await fetch('/api/partner/orders', {
                                headers: { 'Authorization': `Bearer ${session.access_token}` }
                              });
                              if (orderResponse.ok) {
                                const updatedOrders = await orderResponse.json();
                                const updatedOrder = updatedOrders.find(o => o.id === order.id);
                                if (updatedOrder && updatedOrder.details_commande) {
                                  setSelectedOrder(updatedOrder);
                                }
                              }
                            }
                          } catch (err) {
                            console.warn('Erreur lors du chargement des détails:', err);
                          }
                        }
                      }}
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
                        <p><span className="font-medium">Client :</span> {
                          (order.users?.prenom && order.users?.nom) 
                            ? `${order.users.prenom} ${order.users.nom}`.trim()
                            : order.users?.nom 
                            ? order.users.nom
                            : (order.customer?.firstName && order.customer?.lastName)
                            ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                            : order.customer?.lastName || 'Client anonyme'
                        }</p>
                        <p><span className="font-medium">Total :</span> {order.total?.toFixed(2) || order.total_amount?.toFixed(2) || '0.00'}€</p>
                        <p><span className="font-medium">Articles :</span> {order.items?.length || order.order_items?.length || order.details_commande?.length || 0}</p>
                        {order.statut === 'livree' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintOrder(order);
                            }}
                            className="mt-2 inline-flex items-center bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-black text-sm"
                          >
                            🖨️ Imprimer ticket (test livree)
                          </button>
                        )}
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
                <button
                  onClick={() => handlePrintOrder(selectedOrder)}
                  className="mb-4 w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-black transition-colors"
                >
                  🖨️ Imprimer ticket (RawBT Android)
                </button>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <h3 className="font-medium mb-2">Informations client</h3>
                    <p><span className="font-medium">Nom :</span> {
                      (selectedOrder.users?.prenom && selectedOrder.users?.nom) 
                        ? `${selectedOrder.users.prenom} ${selectedOrder.users.nom}`.trim()
                        : selectedOrder.users?.nom 
                        ? selectedOrder.users.nom
                        : (selectedOrder.customer?.firstName && selectedOrder.customer?.lastName)
                        ? `${selectedOrder.customer.firstName} ${selectedOrder.customer.lastName}`.trim()
                        : selectedOrder.customer?.lastName || 'Client anonyme'
                    }</p>
                    <p><span className="font-medium">Téléphone :</span> {selectedOrder.users?.telephone || selectedOrder.customer?.phone || selectedOrder.customer_phone || 'Non disponible'}</p>
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
                      {selectedOrder.details_commande && selectedOrder.details_commande.length > 0 ? (
                        (() => {
                          // Regrouper les formules avec leurs boissons
                          const groupedItems = [];
                          const formulaGroups = {};
                          const processedIndices = new Set();
                          
                          selectedOrder.details_commande.forEach((item, index) => {
                            if (processedIndices.has(index)) return;
                            
                            let customizations = {};
                            if (item.customizations) {
                              if (typeof item.customizations === 'string') {
                                try {
                                  customizations = JSON.parse(item.customizations);
                                } catch (e) {
                                  customizations = {};
                                }
                              } else {
                                customizations = item.customizations;
                              }
                            }
                            
                            const isFormulaDrink = customizations.is_formula_drink === true;
                            const isMenuDrink = customizations.is_menu_drink === true;
                            const isFormulaItem = customizations.is_formula_item === true;
                            const isFormula = customizations.is_formula === true;
                            const formulaName = customizations.formula_name;
                            const formulaId = customizations.formula_id;
                            const menuName = customizations.menu_name;
                            const menuId = customizations.menu_id;
                            
                            // Si c'est une boisson de formule, la regrouper avec la formule principale
                            if (isFormulaDrink && formulaName) {
                              const formulaKey = formulaName + (formulaId || '');
                              if (!formulaGroups[formulaKey]) {
                                formulaGroups[formulaKey] = {
                                  formulaItem: null,
                                  drinks: [],
                                  formulaItems: []
                                };
                              }
                              formulaGroups[formulaKey].drinks.push({
                                item: item,
                                index: index,
                                drinkName: item.menus?.nom || customizations.drink_name || 'Boisson'
                              });
                              processedIndices.add(index);
                              return;
                            }
                            
                            // Si c'est une boisson de menu (non-formule), la regrouper avec le menu principal
                            if (isMenuDrink && menuName) {
                              const menuKey = menuName + (menuId || '');
                              if (!formulaGroups[menuKey]) {
                                formulaGroups[menuKey] = {
                                  formulaItem: null,
                                  drinks: [],
                                  formulaItems: [],
                                  isMenu: true
                                };
                              }
                              formulaGroups[menuKey].drinks.push({
                                item: item,
                                index: index,
                                drinkName: item.menus?.nom || customizations.drink_name || 'Boisson'
                              });
                              processedIndices.add(index);
                              return;
                            }
                            
                            // Si c'est un item de formule, le regrouper
                            if (isFormulaItem && formulaName) {
                              const formulaKey = formulaName + (formulaId || '');
                              if (!formulaGroups[formulaKey]) {
                                formulaGroups[formulaKey] = {
                                  formulaItem: null,
                                  drinks: [],
                                  formulaItems: []
                                };
                              }
                              formulaGroups[formulaKey].formulaItems.push({
                                item: item,
                                index: index,
                                name: item.menus?.nom || 'Article'
                              });
                              processedIndices.add(index);
                              return;
                            }
                            
                            // Si c'est une formule complète (sans formula_items détaillés)
                            if (isFormula && formulaName) {
                              const formulaKey = formulaName + (formulaId || '');
                              if (!formulaGroups[formulaKey]) {
                                formulaGroups[formulaKey] = {
                                  formulaItem: null,
                                  drinks: [],
                                  formulaItems: []
                                };
                              }
                              // CRITIQUE: Utiliser le nom de la formule, pas le nom du menu burger
                              formulaGroups[formulaKey].formulaItem = {
                                item: item,
                                index: index,
                                name: formulaName || 'Formule'
                              };
                              processedIndices.add(index);
                              return;
                            }
                            
                            // Si c'est un menu avec boisson, vérifier si la boisson est déjà dans formulaGroups
                            if (isMenuDrink && menuName) {
                              // Déjà traité plus haut
                              return;
                            }
                            
                            // Vérifier si cet item est un menu qui a une boisson associée (is_menu_drink avec menu_id = plat_id de cet item)
                            const associatedMenuDrink = selectedOrder.details_commande.find((otherItem, otherIndex) => {
                              if (otherIndex === index || processedIndices.has(otherIndex)) return false;
                              let otherCustomizations = {};
                              if (otherItem.customizations) {
                                if (typeof otherItem.customizations === 'string') {
                                  try {
                                    otherCustomizations = JSON.parse(otherItem.customizations);
                                  } catch (e) {
                                    otherCustomizations = {};
                                  }
                                } else {
                                  otherCustomizations = otherItem.customizations;
                                }
                              }
                              return otherCustomizations.is_menu_drink === true && 
                                     otherCustomizations.menu_id === item.plat_id;
                            });
                            
                            // Si c'est un menu avec boisson associée, créer un groupe
                            if (associatedMenuDrink) {
                              let drinkCustomizations = {};
                              if (associatedMenuDrink.customizations) {
                                if (typeof associatedMenuDrink.customizations === 'string') {
                                  try {
                                    drinkCustomizations = JSON.parse(associatedMenuDrink.customizations);
                                  } catch (e) {
                                    drinkCustomizations = {};
                                  }
                                } else {
                                  drinkCustomizations = associatedMenuDrink.customizations;
                                }
                              }
                              
                              const menuKey = (item.menus?.nom || 'Menu') + item.plat_id;
                              if (!formulaGroups[menuKey]) {
                                formulaGroups[menuKey] = {
                                  formulaItem: {
                                    item: item,
                                    index: index,
                                    name: item.menus?.nom || 'Menu'
                                  },
                                  drinks: [],
                                  formulaItems: [],
                                  isMenu: true
                                };
                              }
                              formulaGroups[menuKey].drinks.push({
                                item: associatedMenuDrink,
                                index: selectedOrder.details_commande.indexOf(associatedMenuDrink),
                                drinkName: associatedMenuDrink.menus?.nom || drinkCustomizations.drink_name || 'Boisson'
                              });
                              processedIndices.add(index);
                              processedIndices.add(selectedOrder.details_commande.indexOf(associatedMenuDrink));
                              return;
                            }
                            
                            // Item normal, l'ajouter tel quel
                            groupedItems.push({
                              type: 'normal',
                              item: item,
                              index: index,
                              customizations: customizations
                            });
                            processedIndices.add(index);
                          });
                          
                          // Ajouter les groupes de formules et menus
                          Object.entries(formulaGroups).forEach(([key, group]) => {
                            if (group.isMenu && group.formulaItem) {
                              // Menu avec boisson
                              groupedItems.push({
                                type: 'menu_with_drink',
                                menuItem: group.formulaItem,
                                drinks: group.drinks,
                                menuName: group.formulaItem.name || group.formulaItem.item.menus?.nom
                              });
                            } else if (group.formulaItem) {
                              // Formule complète (sans formula_items détaillés)
                              groupedItems.push({
                                type: 'formula_complete',
                                formulaItem: group.formulaItem,
                                drinks: group.drinks,
                                formulaName: group.formulaItem.name || 'Formule'
                              });
                            } else if (group.formulaItems.length > 0) {
                              // Formule avec formula_items détaillés
                              groupedItems.push({
                                type: 'formula_detailed',
                                formulaItems: group.formulaItems,
                                drinks: group.drinks,
                                formulaName: group.formulaItems[0]?.item?.customizations?.formula_name || 'Formule'
                              });
                            }
                          });
                          
                          // Afficher les items groupés
                          return groupedItems.map((group, groupIndex) => {
                            if (group.type === 'normal') {
                              const item = group.item;
                              const customizations = group.customizations;
                              const isCombo = customizations.combo && customizations.combo.comboName;
                              const comboName = customizations.combo?.comboName;
                              const comboDetails = customizations.combo?.details || [];
                              const displayName = isCombo ? comboName : (item.menus?.nom || 'Article');
                              
                              // Récupérer les suppléments depuis l'item
                              let supplements = [];
                              if (item.supplements) {
                                if (typeof item.supplements === 'string') {
                                  try {
                                    supplements = JSON.parse(item.supplements);
                                  } catch (e) {
                                    supplements = [];
                                  }
                                } else if (Array.isArray(item.supplements)) {
                                  supplements = item.supplements;
                                }
                              }
                              
                              return (
                                <div key={group.index || groupIndex} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>
                                      {displayName} x{item.quantite || 1}
                                      {isCombo && <span className="text-purple-600 ml-1">🍔 Menu</span>}
                                    </span>
                                    <span>{((item.prix_unitaire || 0) * (item.quantite || 1)).toFixed(2)}€</span>
                                  </div>
                                  
                                  {/* Afficher les viandes sélectionnées */}
                                  {customizations.selectedMeats && Array.isArray(customizations.selectedMeats) && customizations.selectedMeats.length > 0 && (
                                    <div className="ml-4 text-xs text-orange-600">
                                      🥩 {customizations.selectedMeats.map(m => m.nom || m.name).join(', ')}
                                    </div>
                                  )}
                                  
                                  {/* Afficher les sauces sélectionnées */}
                                  {customizations.selectedSauces && Array.isArray(customizations.selectedSauces) && customizations.selectedSauces.length > 0 && (
                                    <div className="ml-4 text-xs text-teal-600">
                                      🧂 {customizations.selectedSauces.map(s => s.nom || s.name).join(', ')}
                                    </div>
                                  )}
                                  
                                  {/* Afficher les suppléments */}
                                  {supplements.length > 0 && (
                                    <div className="ml-4 text-xs text-green-600">
                                      ➕ Suppléments: {supplements.map(s => s.nom || s.name || 'Supplément').join(', ')}
                                    </div>
                                  )}
                                  
                                  {/* Afficher les ingrédients retirés */}
                                  {customizations.removedIngredients && Array.isArray(customizations.removedIngredients) && customizations.removedIngredients.length > 0 && (
                                    <div className="ml-4 text-xs text-red-600 line-through">
                                      ❌ Sans: {customizations.removedIngredients.map(i => i.nom || i.name).join(', ')}
                                    </div>
                                  )}
                                  
                                  {isCombo && comboDetails.length > 0 && (
                                    <div className="ml-4 text-xs text-gray-600 space-y-0.5">
                                      {comboDetails.map((detail, idx) => (
                                        <div key={idx}>
                                          • {detail.stepTitle}: <strong>
                                            {detail.optionName}
                                            {detail.variantName && ` (${detail.variantName})`}
                                          </strong>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            } else if (group.type === 'formula_complete') {
                              // Formule complète (sans formula_items détaillés) - Cas Cevenol Burger
                              const formulaItem = group.formulaItem.item;
                              const formulaName = group.formulaName;
                              const totalPrice = (formulaItem.prix_unitaire || 0) * (formulaItem.quantite || 1);
                              
                              // Récupérer les customizations pour obtenir le formula_id
                              let customizations = {};
                              if (formulaItem.customizations) {
                                if (typeof formulaItem.customizations === 'string') {
                                  try {
                                    customizations = JSON.parse(formulaItem.customizations);
                                  } catch (e) {
                                    customizations = {};
                                  }
                                } else {
                                  customizations = formulaItem.customizations;
                                }
                              }
                              const formulaId = customizations.formula_id;
                              
                              // Récupérer les vrais éléments de la formule depuis les customizations (stockés lors de la commande)
                              // OU depuis le cache si disponibles
                              let realFormulaItems = [];
                              if (customizations.formula_items_details && Array.isArray(customizations.formula_items_details)) {
                                // Utiliser les détails stockés dans les customizations (source de vérité)
                                realFormulaItems = customizations.formula_items_details.map(fi => ({
                                  name: fi.nom || 'Article',
                                  quantity: fi.quantity || 1
                                }));
                              } else if (formulaId && formulaItemsCache[formulaId]) {
                                // Fallback: utiliser le cache si les détails ne sont pas dans customizations
                                realFormulaItems = formulaItemsCache[formulaId];
                              }
                              
                              return (
                                <div key={group.formulaItem.index || groupIndex} className="space-y-1 border-l-2 border-purple-300 pl-2">
                                  <div className="flex justify-between text-sm font-medium">
                                    <span>
                                      🍔 {formulaName} x{formulaItem.quantite || 1}
                                    </span>
                                    <span>{totalPrice.toFixed(2)}€</span>
                                  </div>
                                  <div className="ml-4 text-xs text-gray-600 space-y-0.5">
                                    {/* Afficher les vrais éléments de la formule si disponibles */}
                                    {realFormulaItems.length > 0 ? (
                                      <>
                                        {realFormulaItems.map((item, itemIdx) => (
                                          <div key={itemIdx}>• {item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}</div>
                                        ))}
                                      </>
                                    ) : (
                                      <div className="text-gray-500 italic">(Formule complète - burger, frites, boisson)</div>
                                    )}
                                    
                                    {/* Afficher les viandes sélectionnées */}
                                    {customizations.selectedMeats && Array.isArray(customizations.selectedMeats) && customizations.selectedMeats.length > 0 && (
                                      <div className="mt-1 pt-1 border-t border-gray-200">
                                        <div className="font-semibold text-orange-600">Viandes :</div>
                                        {customizations.selectedMeats.map((meat, idx) => (
                                          <div key={idx} className="text-orange-600">🥩 {meat.nom || meat.name || 'Viande'}</div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Afficher les sauces sélectionnées */}
                                    {customizations.selectedSauces && Array.isArray(customizations.selectedSauces) && customizations.selectedSauces.length > 0 && (
                                      <div className="mt-1 pt-1 border-t border-gray-200">
                                        <div className="font-semibold text-teal-600">Sauces :</div>
                                        {customizations.selectedSauces.map((sauce, idx) => (
                                          <div key={idx} className="text-teal-600">🧂 {sauce.nom || sauce.name || 'Sauce'}</div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Afficher les ingrédients retirés */}
                                    {customizations.removedIngredients && Array.isArray(customizations.removedIngredients) && customizations.removedIngredients.length > 0 && (
                                      <div className="mt-1 pt-1 border-t border-gray-200">
                                        <div className="font-semibold text-red-600">Ingrédients retirés :</div>
                                        {customizations.removedIngredients.map((ing, idx) => (
                                          <div key={idx} className="text-red-600 line-through">❌ {ing.nom || ing.name || 'Ingrédient'}</div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Afficher les ingrédients ajoutés */}
                                    {customizations.addedIngredients && Array.isArray(customizations.addedIngredients) && customizations.addedIngredients.length > 0 && (
                                      <div className="mt-1 pt-1 border-t border-gray-200">
                                        <div className="font-semibold text-green-600">Suppléments ajoutés :</div>
                                        {customizations.addedIngredients.map((ingId, idx) => {
                                          // Essayer de trouver le nom du supplément depuis les suppléments de l'item
                                          const supplementName = `Supplément ${idx + 1}`;
                                          return (
                                            <div key={idx} className="text-green-600">➕ {supplementName}</div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    
                                    {/* Boissons de la formule */}
                                    {group.drinks.length > 0 && (
                                      <>
                                        {group.drinks.map((drink, idx) => (
                                          <div key={idx} className="text-blue-600">🥤 {drink.drinkName}</div>
                                        ))}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            } else if (group.type === 'menu_with_drink') {
                              // Menu avec boisson (non-formule)
                              const menuItem = group.menuItem.item;
                              const menuName = group.menuName;
                              const totalPrice = (menuItem.prix_unitaire || 0) * (menuItem.quantite || 1);
                              
                              // Récupérer les customizations
                              let customizations = {};
                              if (menuItem.customizations) {
                                if (typeof menuItem.customizations === 'string') {
                                  try {
                                    customizations = JSON.parse(menuItem.customizations);
                                  } catch (e) {
                                    customizations = {};
                                  }
                                } else {
                                  customizations = menuItem.customizations;
                                }
                              }
                              
                              return (
                                <div key={group.menuItem.index || groupIndex} className="space-y-1 border-l-2 border-blue-300 pl-2">
                                  <div className="flex justify-between text-sm font-medium">
                                    <span>
                                      🍽️ {menuName} x{menuItem.quantite || 1}
                                    </span>
                                    <span>{totalPrice.toFixed(2)}€</span>
                                  </div>
                                  
                                  {/* Afficher les viandes sélectionnées */}
                                  {customizations.selectedMeats && Array.isArray(customizations.selectedMeats) && customizations.selectedMeats.length > 0 && (
                                    <div className="ml-4 text-xs text-orange-600">
                                      🥩 {customizations.selectedMeats.map(m => m.nom || m.name).join(', ')}
                                    </div>
                                  )}
                                  
                                  {/* Afficher les sauces sélectionnées */}
                                  {customizations.selectedSauces && Array.isArray(customizations.selectedSauces) && customizations.selectedSauces.length > 0 && (
                                    <div className="ml-4 text-xs text-teal-600">
                                      🧂 {customizations.selectedSauces.map(s => s.nom || s.name).join(', ')}
                                    </div>
                                  )}
                                  
                                  {/* Afficher les ingrédients retirés */}
                                  {customizations.removedIngredients && Array.isArray(customizations.removedIngredients) && customizations.removedIngredients.length > 0 && (
                                    <div className="ml-4 text-xs text-red-600 line-through">
                                      ❌ Sans: {customizations.removedIngredients.map(i => i.nom || i.name).join(', ')}
                                    </div>
                                  )}
                                  
                                  {/* Boissons du menu */}
                                  {group.drinks.length > 0 && (
                                    <div className="ml-4 mt-1">
                                      {group.drinks.map((drink, idx) => {
                                        const drinkPrice = (drink.item.prix_unitaire || 0) * (drink.item.quantite || 1);
                                        return (
                                          <div key={drink.index || idx} className="flex justify-between text-xs text-blue-600">
                                            <span>🥤 {drink.drinkName}</span>
                                            <span className={drinkPrice === 0 ? 'text-gray-400' : ''}>
                                              {drinkPrice === 0 ? '(inclus)' : `${drinkPrice.toFixed(2)}€`}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            } else if (group.type === 'formula_detailed') {
                              // Formule avec formula_items détaillés
                              const formulaName = group.formulaName;
                              let totalPrice = 0;
                              
                              return (
                                <div key={groupIndex} className="space-y-1 border-l-2 border-purple-300 pl-2">
                                  <div className="text-sm font-medium text-purple-600 mb-1">
                                    🍔 {formulaName}
                                  </div>
                                  <div className="ml-4 space-y-1">
                                    {group.formulaItems.map((formulaItem, idx) => {
                                      const itemPrice = (formulaItem.item.prix_unitaire || 0) * (formulaItem.item.quantite || 1);
                                      totalPrice += itemPrice;
                                      
                                      // Récupérer les customizations pour cet item
                                      let itemCustomizations = {};
                                      if (formulaItem.item.customizations) {
                                        if (typeof formulaItem.item.customizations === 'string') {
                                          try {
                                            itemCustomizations = JSON.parse(formulaItem.item.customizations);
                                          } catch (e) {
                                            itemCustomizations = {};
                                          }
                                        } else {
                                          itemCustomizations = formulaItem.item.customizations;
                                        }
                                      }
                                      
                                      return (
                                        <div key={formulaItem.index || idx} className="space-y-0.5">
                                          <div className="flex justify-between text-xs">
                                            <span>• {formulaItem.name} x{formulaItem.item.quantite || 1}</span>
                                            <span className={itemPrice === 0 ? 'text-gray-400' : ''}>
                                              {itemPrice === 0 ? '(inclus)' : `${itemPrice.toFixed(2)}€`}
                                            </span>
                                          </div>
                                          
                                          {/* Afficher les viandes sélectionnées pour cet item */}
                                          {itemCustomizations.selectedMeats && Array.isArray(itemCustomizations.selectedMeats) && itemCustomizations.selectedMeats.length > 0 && (
                                            <div className="ml-2 text-xs text-orange-600">
                                              🥩 {itemCustomizations.selectedMeats.map(m => m.nom || m.name).join(', ')}
                                            </div>
                                          )}
                                          
                                          {/* Afficher les sauces sélectionnées pour cet item */}
                                          {itemCustomizations.selectedSauces && Array.isArray(itemCustomizations.selectedSauces) && itemCustomizations.selectedSauces.length > 0 && (
                                            <div className="ml-2 text-xs text-teal-600">
                                              🧂 {itemCustomizations.selectedSauces.map(s => s.nom || s.name).join(', ')}
                                            </div>
                                          )}
                                          
                                          {/* Afficher les ingrédients retirés */}
                                          {itemCustomizations.removedIngredients && Array.isArray(itemCustomizations.removedIngredients) && itemCustomizations.removedIngredients.length > 0 && (
                                            <div className="ml-2 text-xs text-red-600">
                                              ❌ Sans: {itemCustomizations.removedIngredients.map(i => i.nom || i.name).join(', ')}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {/* Boissons de la formule */}
                                    {group.drinks.map((drink, idx) => {
                                      const drinkPrice = (drink.item.prix_unitaire || 0) * (drink.item.quantite || 1);
                                      totalPrice += drinkPrice;
                                      return (
                                        <div key={drink.index || idx} className="flex justify-between text-xs text-blue-600">
                                          <span>🥤 {drink.drinkName}</span>
                                          <span className={drinkPrice === 0 ? 'text-gray-400' : ''}>
                                            {drinkPrice === 0 ? '(inclus)' : `${drinkPrice.toFixed(2)}€`}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="flex justify-between text-sm font-medium mt-1">
                                    <span>Total formule</span>
                                    <span>{totalPrice.toFixed(2)}€</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          });
                        })()
                      ) : selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item, index) => (
                          <div key={item.id || index} className="flex justify-between text-sm">
                            <span>{item.name || item.nom || 'Article'} x{item.quantity || item.quantite || 1}</span>
                            <span>{((item.price || item.prix || 0) * (item.quantity || item.quantite || 1)).toFixed(2)}€</span>
                          </div>
                        ))
                      ) : selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                        selectedOrder.order_items.map((item, index) => (
                          <div key={item.id || index} className="flex justify-between text-sm">
                            <span>{item.name || item.nom || 'Article'} x{item.quantity || item.quantite || 1}</span>
                            <span>{((item.price || item.prix || 0) * (item.quantity || item.quantite || 1)).toFixed(2)}€</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">Chargement des détails...</p>
                      )}
                    </div>
                    <div className="border-t mt-2 pt-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Sous-total</span>
                        <span>{selectedOrder.details_commande?.reduce((sum, item) => sum + (item.prix_unitaire * item.quantite), 0).toFixed(2) || '0.00'}€</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Frais de livraison</span>
                        <span>{(selectedOrder.frais_livraison || 0).toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total</span>
                        <span>{(selectedOrder.details_commande?.reduce((sum, item) => sum + (item.prix_unitaire * item.quantite), 0) + (selectedOrder.frais_livraison || 0)).toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions selon le statut */}
                {selectedOrder.statut === 'en_attente' && (
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
                      onClick={() => updateOrderStatus(selectedOrder.id, 'en_preparation', '', preparationTime)}
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
                        onClick={() => updateOrderStatus(selectedOrder.id, 'refusee', rejectionReason)}
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

                {/* DEBUG : Afficher le statut actuel */}
                <div className="bg-gray-100 p-2 rounded text-sm">
                  <strong>DEBUG :</strong> Statut = "{selectedOrder.statut}", Delivery ID = {selectedOrder.delivery_id || 'null'}
                </div>
                
                {selectedOrder.statut === 'en_preparation' && !selectedOrder.delivery_id && (
                  <div className="space-y-2">
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'pret_a_livrer')}
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      📦 Marquer comme prête
                    </button>
                  </div>
                )}
                
                {/* Afficher le bouton pour TOUS les statuts en_preparation */}
                {selectedOrder.statut === 'en_preparation' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, 'pret_a_livrer')}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      🔧 FORCE: Marquer comme prête
                    </button>
                  </div>
                )}

                {selectedOrder.statut === 'pret_a_livrer' && !selectedOrder.delivery_id && (
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <p className="text-blue-800 font-medium">Commande prête !</p>
                      <p className="text-sm text-blue-600 mt-1">
                        En attente qu'un livreur accepte et livre la commande
                      </p>
                    </div>
                  </div>
                )}

                {selectedOrder.statut === 'pret_a_livrer' && selectedOrder.delivery_id && (
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

                {selectedOrder.statut === 'en_preparation' && selectedOrder.delivery_id && (
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
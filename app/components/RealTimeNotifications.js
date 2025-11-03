'use client';
import { useState, useEffect, useRef } from 'react';
import { FaBell, FaTimes, FaShoppingCart, FaEuroSign, FaExclamationCircle } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';

export default function RealTimeNotifications({ restaurantId, onOrderClick }) {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertOrder, setAlertOrder] = useState(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const audioContextRef = useRef(null);
  const lastOrderCheckRef = useRef(null);
  const soundIntervalRef = useRef(null);

  useEffect(() => {
    if (!restaurantId) {
      console.warn('⚠️ RealTimeNotifications: restaurantId manquant');
      return;
    }

    console.log('🔍 RealTimeNotifications - Initialisation pour restaurantId:', restaurantId);
    setIsConnected(true);

    // Utiliser Supabase Realtime directement côté client
    console.log('🔍 Configuration Supabase Realtime côté client...');
    const channel = supabase
      .channel(`restaurant_${restaurantId}_orders`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'commandes',
          filter: `restaurant_id=eq.${restaurantId}`
        }, 
        (payload) => {
          console.log('🔔 NOUVELLE COMMANDE DÉTECTÉE via Supabase Realtime:', payload.new.id);
          console.log('🔔 Détails commande:', {
            id: payload.new.id,
            restaurant_id: payload.new.restaurant_id,
            statut: payload.new.statut,
            total: payload.new.total
          });
          
          // Déclencher l'alerte pour nouvelle commande
          triggerNewOrderAlert(payload.new);
          
          // Afficher une notification du navigateur
          if (Notification.permission === 'granted') {
            new Notification('Nouvelle commande !', {
              body: `Nouvelle commande #${payload.new.id?.slice(0, 8) || 'N/A'} - ${payload.new.total || 0}€`,
              icon: '/icon-192x192.png',
              tag: 'new-order',
              requireInteraction: false
            });
          }
          
          // Ajouter la notification avec un effet visuel
          const newNotification = {
            id: Date.now(),
            type: 'new_order',
            message: `Nouvelle commande #${payload.new.id?.slice(0, 8) || 'N/A'} - ${payload.new.total || 0}€`,
            data: payload.new,
            timestamp: new Date().toISOString(),
            isNew: true
          };
          
          setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
          
          // Auto-fermer la pop-up après 10 secondes
          setTimeout(() => {
            setShowAlert(false);
          }, 10000);
          
          // Supprimer l'effet "nouveau" après 5 secondes
          setTimeout(() => {
            setNotifications(prev => 
              prev.map(n => n.id === newNotification.id ? { ...n, isNew: false } : n)
            );
          }, 5000);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'commandes',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('🔄 Commande mise à jour via Supabase Realtime:', payload.new.id);
          // Optionnel : afficher une notification pour les mises à jour
        }
      )
      .subscribe((status) => {
        console.log('🔍 Statut abonnement Supabase Realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Abonnement Supabase Realtime actif pour restaurant:', restaurantId);
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erreur abonnement Supabase Realtime');
          setIsConnected(false);
        }
      });

    // Système de polling en fallback (vérifie toutes les 5 secondes)
    const pollingInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !restaurantId) return;

        // Récupérer la dernière commande
        const { data: orders, error } = await supabase
          .from('commandes')
          .select('id, created_at, statut, restaurant_id')
          .eq('restaurant_id', restaurantId)
          .eq('statut', 'en_attente')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.warn('⚠️ Erreur polling commandes:', error);
          return;
        }

        if (orders && orders.length > 0) {
          const latestOrder = orders[0];
          const latestOrderId = latestOrder.id;

          // Si c'est une nouvelle commande que nous n'avons pas encore vue ET qu'elle est toujours en attente
          if (latestOrderId !== lastOrderCheckRef.current && latestOrder.statut === 'en_attente') {
            console.log('🔔 NOUVELLE COMMANDE DÉTECTÉE via polling:', latestOrderId);
            
            // Récupérer les détails complets de la commande
            const { data: fullOrder, error: orderError } = await supabase
              .from('commandes')
              .select('*')
              .eq('id', latestOrderId)
              .single();

            if (!orderError && fullOrder && fullOrder.statut === 'en_attente') {
              triggerNewOrderAlert(fullOrder);
              lastOrderCheckRef.current = latestOrderId;
            }
          } else if (latestOrderId === pendingOrderId && latestOrder.statut !== 'en_attente') {
            // Si la commande en attente n'est plus en attente, arrêter les alertes
            console.log('✅ Commande traitée, arrêt des alertes:', latestOrder.statut);
            if (soundIntervalRef.current) {
              clearInterval(soundIntervalRef.current);
              soundIntervalRef.current = null;
            }
            setShowAlert(false);
            setIsBlinking(false);
            setPendingOrderId(null);
          }
        } else if (pendingOrderId) {
          // Plus de commandes en attente, arrêter les alertes
          console.log('✅ Plus de commandes en attente, arrêt des alertes');
          if (soundIntervalRef.current) {
            clearInterval(soundIntervalRef.current);
            soundIntervalRef.current = null;
          }
          setShowAlert(false);
          setIsBlinking(false);
          setPendingOrderId(null);
        }
      } catch (pollingError) {
        console.warn('⚠️ Erreur polling:', pollingError);
      }
    }, 5000); // Toutes les 5 secondes

    // Nettoyer la connexion
    return () => {
      console.log('🧹 Nettoyage connexion Supabase Realtime et polling');
      channel.unsubscribe();
      clearInterval(pollingInterval);
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
      }
      setIsConnected(false);
    };
  }, [restaurantId]); // Retirer lastOrderId des dépendances pour éviter la boucle infinie

  // Fonction pour déclencher l'alerte de nouvelle commande
  const triggerNewOrderAlert = (order) => {
    // Ne déclencher l'alerte que pour les commandes en attente
    if (order.statut !== 'en_attente') {
      console.log('⚠️ Commande non en attente, alerte ignorée:', order.statut);
      return;
    }

    // Si c'est la même commande qui est encore en attente, ne pas redéclencher l'alerte
    if (pendingOrderId === order.id && showAlert) {
      console.log('⚠️ Alerte déjà active pour cette commande, ignorée:', order.id);
      return;
    }

    // Vérifier si on a déjà alerté pour cette commande (éviter les doublons)
    if (lastOrderCheckRef.current === order.id) {
      console.log('⚠️ Commande déjà alertée précédemment, ignorée:', order.id);
      return;
    }

    console.log('🎉 DÉCLENCHEMENT ALERTE - Nouvelle commande:', order.id);
    
    // Mettre à jour lastOrderCheckRef immédiatement pour éviter les doublons
    lastOrderCheckRef.current = order.id;
    
    // Afficher une pop-up d'alerte
    setAlertOrder(order);
    setShowAlert(true);
    setIsBlinking(true);
    setPendingOrderId(order.id);
    
    // Jouer une alerte sonore initiale (plusieurs fois)
    playNotificationSound();
    setTimeout(() => playNotificationSound(), 500); // Double bip
    
    // Démarrer un intervalle pour jouer le son toutes les 4 secondes
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
    }
    soundIntervalRef.current = setInterval(() => {
      // Vérifier que la commande est toujours en attente avant de jouer le son
      checkOrderStatusAndPlaySound(order.id);
    }, 4000); // Toutes les 4 secondes
    
    // Afficher une notification du navigateur
    if (Notification.permission === 'granted') {
      new Notification('🎉 NOUVELLE COMMANDE !', {
        body: `Commande #${order.id?.slice(0, 8) || 'N/A'} - ${(() => {
          const totalAmount = parseFloat(order.total || 0) || 0;
          const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
          return (totalAmount + deliveryFee).toFixed(2);
        })()}€`,
        icon: '/icon-192x192.png',
        tag: `order-${order.id}`,
        requireInteraction: true,
        badge: '/icon-192x192.png'
      });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Ajouter la notification avec un effet visuel
    const newNotification = {
      id: Date.now(),
      type: 'new_order',
      message: `Nouvelle commande #${order.id?.slice(0, 8) || 'N/A'} - ${(() => {
        const totalAmount = parseFloat(order.total || 0) || 0;
        const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
        return (totalAmount + deliveryFee).toFixed(2);
      })()}€`,
      data: order,
      timestamp: new Date().toISOString(),
      isNew: true
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    
    // Arrêter le clignotement après 10 secondes
    setTimeout(() => {
      setIsBlinking(false);
    }, 10000);
  };

  // Fonction pour vérifier le statut de la commande et jouer le son si toujours en attente
  const checkOrderStatusAndPlaySound = async (orderId) => {
    try {
      const { data: order, error } = await supabase
        .from('commandes')
        .select('statut')
        .eq('id', orderId)
        .single();

      if (error) {
        console.warn('⚠️ Erreur vérification statut commande:', error);
        return;
      }

      // Si la commande n'est plus en attente, arrêter le son et fermer la pop-up
      if (order.statut !== 'en_attente') {
        console.log('✅ Commande traitée, arrêt des alertes:', order.statut);
        if (soundIntervalRef.current) {
          clearInterval(soundIntervalRef.current);
          soundIntervalRef.current = null;
        }
        setShowAlert(false);
        setIsBlinking(false);
        setPendingOrderId(null);
        return;
      }

      // La commande est toujours en attente, jouer le son
      playNotificationSound();
    } catch (error) {
      console.warn('⚠️ Erreur vérification statut:', error);
    }
  };

  // Fonction pour jouer une alerte sonore
  const playNotificationSound = () => {
    try {
      // Initialiser ou réutiliser le contexte audio (nécessite une interaction utilisateur pour la première fois)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // Reprendre le contexte s'il est suspendu (peut arriver après inactivité)
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {
          console.warn('Contexte audio suspendu, utilisation du fallback');
          playFallbackSound();
          return;
        });
      }
      
      // Créer un oscillateur pour générer un son
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Connecter les nœuds
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configurer le son (bip agréable)
      oscillator.frequency.value = 800; // Fréquence en Hz
      oscillator.type = 'sine';
      
      // Enveloppe ADSR (Attack, Decay, Sustain, Release)
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01); // Attack - volume plus élevé
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1); // Decay
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.2); // Sustain
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3); // Release
      
      // Jouer le son
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      
      // Répéter une deuxième fois après un court délai (double bip)
      setTimeout(() => {
        try {
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          oscillator2.frequency.value = 1000;
          oscillator2.type = 'sine';
          
          const now2 = audioContext.currentTime;
          gainNode2.gain.setValueAtTime(0, now2);
          gainNode2.gain.linearRampToValueAtTime(0.5, now2 + 0.01);
          gainNode2.gain.linearRampToValueAtTime(0.3, now2 + 0.1);
          gainNode2.gain.linearRampToValueAtTime(0.3, now2 + 0.2);
          gainNode2.gain.linearRampToValueAtTime(0, now2 + 0.3);
          
          oscillator2.start(now2);
          oscillator2.stop(now2 + 0.3);
        } catch (e) {
          console.warn('Erreur deuxième bip:', e);
        }
      }, 150);
    } catch (error) {
      console.warn('Impossible de jouer le son avec AudioContext:', error);
      playFallbackSound();
    }
  };

  // Fallback pour le son (utilise un élément audio HTML5)
  const playFallbackSound = () => {
    try {
      // Créer un élément audio temporaire pour jouer un bip
      const audio = document.createElement('audio');
      // Générer un bip simple avec Web Audio API en fallback
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = 800;
      osc.type = 'sine';
      
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (error) {
      console.warn('Impossible de jouer le son de fallback:', error);
    }
  };

  // Demander la permission pour les notifications du navigateur
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Permission notification:', permission);
      });
    }
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_order':
        return <FaShoppingCart className="h-4 w-4 text-blue-600" />;
      case 'revenue':
        return <FaEuroSign className="h-4 w-4 text-green-600" />;
      case 'alert':
        return <FaExclamationCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FaBell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'new_order':
        return 'bg-blue-50 border-blue-200';
      case 'revenue':
        return 'bg-green-50 border-green-200';
      case 'alert':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (!restaurantId) return null;

  return (
    <>
      {/* Pop-up d'alerte pour nouvelle commande */}
      {showAlert && alertOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 ${isBlinking ? 'animate-pulse ring-4 ring-yellow-400 dark:ring-yellow-500' : ''}`} style={{
            animation: isBlinking ? 'blink 0.5s infinite' : 'none',
            boxShadow: isBlinking ? '0 0 20px rgba(251, 191, 36, 0.8)' : ''
          }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <FaShoppingCart className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">🎉 Nouvelle commande !</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Une nouvelle commande vient d'arriver</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAlert(false);
                  setIsBlinking(false);
                  if (soundIntervalRef.current) {
                    clearInterval(soundIntervalRef.current);
                    soundIntervalRef.current = null;
                  }
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
            
            <div className={`bg-blue-50 dark:bg-blue-900 rounded-lg p-4 mb-4 ${isBlinking ? 'bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-400 dark:border-yellow-500' : ''}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Commande #</p>
                  <p className={`text-lg font-bold ${isBlinking ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{alertOrder.id?.slice(0, 8) || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total</p>
                  <p className={`text-2xl font-bold ${isBlinking ? 'text-red-600 dark:text-red-400 animate-bounce' : 'text-green-600 dark:text-green-400'}`}>
                    {(() => {
                      // Calculer le total correctement : total des articles + frais de livraison
                      const totalAmount = parseFloat(alertOrder.total || 0) || 0;
                      const deliveryFee = parseFloat(alertOrder.frais_livraison || 0) || 0;
                      const totalWithDelivery = totalAmount + deliveryFee;
                      return totalWithDelivery.toFixed(2);
                    })()}€
                  </p>
                </div>
              </div>
              {alertOrder.adresse_livraison && (
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                  <p className="text-xs text-gray-600 dark:text-gray-300">Adresse de livraison</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{alertOrder.adresse_livraison}</p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAlert(false);
                  setIsBlinking(false);
                  // Arrêter le son répétitif
                  if (soundIntervalRef.current) {
                    clearInterval(soundIntervalRef.current);
                    soundIntervalRef.current = null;
                  }
                  // Utiliser le callback pour changer d'onglet dans la page parente
                  if (onOrderClick) {
                    onOrderClick();
                  }
                  
                  // Fallback supplémentaire: utiliser window.location avec hash
                  setTimeout(() => {
                    const dashboardTab = document.querySelector('[data-tab="orders"]');
                    if (dashboardTab) {
                      dashboardTab.click();
                    }
                    // Aussi essayer de changer l'URL pour forcer la navigation
                    if (window.location.pathname === '/partner') {
                      window.history.pushState({}, '', '/partner#orders');
                    }
                  }, 100);
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                📦 Voir la commande
              </button>
              <button
                onClick={() => {
                  setShowAlert(false);
                  setIsBlinking(false);
                  // Arrêter le son répétitif
                  if (soundIntervalRef.current) {
                    clearInterval(soundIntervalRef.current);
                    soundIntervalRef.current = null;
                  }
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative">
      {/* Bouton notifications */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <FaBell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
        {isConnected && (
          <span className="absolute -bottom-1 -right-1 bg-green-500 rounded-full h-2 w-2"></span>
        )}
      </button>

      {/* Panneau notifications */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center mt-2">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span className="text-xs text-gray-500">
                {isConnected ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <FaBell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 ${getNotificationColor(notification.type)} ${
                      notification.isNew ? 'animate-pulse' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.timestamp).toLocaleTimeString('fr-FR')}
                          </p>
                          {notification.data && (
                            <div className="mt-2 text-xs text-gray-600">
                              <p>Commande #{notification.data.id}</p>
                              <p className="text-gray-500">Total: {notification.data.total_amount || notification.data.total}€</p>
                              <p className="text-green-600 font-semibold">Votre gain: {((notification.data.total_amount || notification.data.total || 0) * 0.80).toFixed(2)}€</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600 ml-2"
                      >
                        <FaTimes className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <button
                onClick={() => setNotifications([])}
                className="w-full text-sm text-gray-600 hover:text-gray-800"
              >
                Effacer toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
} 
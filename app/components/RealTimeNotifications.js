'use client';
import { useState, useEffect, useRef } from 'react';
import { FaBell, FaTimes, FaShoppingCart, FaEuroSign, FaExclamationCircle } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';

const isNotificationSupported = () => typeof window !== 'undefined' && 'Notification' in window;

const showBrowserNotification = (title, options) => {
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      new Notification(title, options);
    } catch (error) {
      console.warn('Notification non supportée:', error);
    }
  }
};

const requestBrowserNotificationPermission = () => {
  if (isNotificationSupported() && Notification.permission === 'default') {
    try {
      Notification.requestPermission();
    } catch (error) {
      console.warn('Impossible de demander la permission de notification:', error);
    }
  }
};

const hasWindow = () => typeof window !== 'undefined';

const bufferToWaveDataUri = (buffer) => {
  try {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const blockAlign = numChannels * (bitDepth / 8);
    const byteRate = sampleRate * blockAlign;
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i += 1) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    const interleaved = new Float32Array(buffer.length * numChannels);
    let interleavedIndex = 0;

    for (let i = 0; i < buffer.length; i += 1) {
      for (let channel = 0; channel < numChannels; channel += 1) {
        interleaved[interleavedIndex] = buffer.getChannelData(channel)[i];
        interleavedIndex += 1;
      }
    }

    for (let i = 0; i < interleaved.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, interleaved[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }

    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
  } catch (error) {
    console.warn('Impossible de convertir le buffer audio en WAV:', error);
    return null;
  }
};

const generateToneDataUri = async () => {
  if (!hasWindow() || !(window.OfflineAudioContext || window.webkitOfflineAudioContext)) {
    return null;
  }

  try {
    const duration = 0.45;
    const sampleRate = 44100;
    const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const offline = new OfflineContext(1, sampleRate * duration, sampleRate);

    const oscillator = offline.createOscillator();
    const gain = offline.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 880;

    oscillator.connect(gain);
    gain.connect(offline.destination);

    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.7, 0.05);
    gain.gain.linearRampToValueAtTime(0.55, 0.2);
    gain.gain.linearRampToValueAtTime(0, duration);

    oscillator.start(0);
    oscillator.stop(duration);

    const rendered = await offline.startRendering();
    return bufferToWaveDataUri(rendered);
  } catch (error) {
    console.warn('Impossible de générer le son de notification:', error);
    return null;
  }
};

export default function RealTimeNotifications({ restaurantId, onOrderClick }) {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertOrder, setAlertOrder] = useState(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef(null);
  const audioElementRef = useRef(null);
  const generatingToneRef = useRef(false);
  const lastOrderCheckRef = useRef(null);
  const soundIntervalRef = useRef(null);

  const ensureTonePrepared = async () => {
    if (!hasWindow()) return;
    if (audioElementRef.current || generatingToneRef.current) return;
    generatingToneRef.current = true;
    try {
      const dataUri = await generateToneDataUri();
      if (dataUri) {
        const audioEl = new Audio(dataUri);
        audioEl.preload = 'auto';
        audioEl.volume = 1;
        audioElementRef.current = audioEl;
      }
    } catch (error) {
      console.warn('Impossible de préparer le son HTML5:', error);
    } finally {
      generatingToneRef.current = false;
    }
  };

  useEffect(() => {
    if (!hasWindow()) return;
    try {
      const stored = localStorage.getItem('restaurant-sound-enabled');
      if (stored !== null) {
        setSoundEnabled(stored === 'true');
      }
    } catch (error) {
      console.warn('Impossible de charger la préférence sonore:', error);
    }
  }, []);

  useEffect(() => {
    if (!hasWindow()) return;
    try {
      localStorage.setItem('restaurant-sound-enabled', soundEnabled ? 'true' : 'false');
    } catch (error) {
      console.warn('Impossible de sauvegarder la préférence sonore:', error);
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (!hasWindow()) return;

    const unlockAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume().catch(() => {});
        }
      } catch (error) {
        console.warn('Impossible d\'initialiser le contexte audio:', error);
      }
      await ensureTonePrepared();
    };

    const events = ['pointerdown', 'touchstart', 'keydown'];
    events.forEach((eventName) => window.addEventListener(eventName, unlockAudio));
    // Essayer immédiatement
    unlockAudio();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, unlockAudio));
    };
  }, []);

  useEffect(() => {
    ensureTonePrepared();
  }, []);

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    setIsConnected(true);
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
          // Déclencher l'alerte pour nouvelle commande
          triggerNewOrderAlert(payload.new);
          
          // IMPORTANT: Calculer le montant total avec les frais de livraison
          const totalWithDelivery = (parseFloat(payload.new.total || 0) + parseFloat(payload.new.frais_livraison || 0)).toFixed(2);
          
          // Afficher une notification du navigateur
          showBrowserNotification('Nouvelle commande !', {
            body: `Nouvelle commande #${payload.new.id?.slice(0, 8) || 'N/A'} - ${totalWithDelivery}€`,
            icon: '/icon-192x192.png',
            tag: 'new-order',
            requireInteraction: false
          });
          
          // Ajouter la notification avec un effet visuel
          const newNotification = {
            id: Date.now(),
            type: 'new_order',
            message: `Nouvelle commande #${payload.new.id?.slice(0, 8) || 'N/A'} - ${totalWithDelivery}€`,
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
          // Si la commande en attente est mise à jour (acceptée/refusée), arrêter les alertes
          if (pendingOrderId === payload.new.id && payload.new.statut !== 'en_attente') {
            if (soundIntervalRef.current) {
              clearInterval(soundIntervalRef.current);
              soundIntervalRef.current = null;
            }
            setShowAlert(false);
            setIsBlinking(false);
            setPendingOrderId(null);
          }
          
          // Si la commande est annulée, déclencher une alerte
          if (payload.new.statut === 'annulee' && payload.old?.statut !== 'annulee') {
            triggerCancellationAlert(payload.new);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
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
              
              // Vérifier si une commande a été annulée (en comparant avec la dernière vérification)
              // Pour cela, on récupère toutes les commandes récentes et on vérifie les changements de statut
              if (latestOrder.statut === 'annulee') {
                // Récupérer les détails complets pour vérifier si c'est une nouvelle annulation
                const { data: fullOrder, error: orderError } = await supabase
                  .from('commandes')
                  .select('*')
                  .eq('id', latestOrderId)
                  .single();

                if (!orderError && fullOrder) {
                  // Vérifier si on n'a pas déjà alerté pour cette annulation
                  if (lastOrderCheckRef.current !== latestOrderId || !showAlert) {
                    triggerCancellationAlert(fullOrder);
                    lastOrderCheckRef.current = latestOrderId;
                  }
                }
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
    showBrowserNotification('🎉 NOUVELLE COMMANDE !', {
      body: `Commande #${order.id?.slice(0, 8) || 'N/A'} - ${(() => {
        // IMPORTANT: Le prix affiché côté restaurant ne doit PAS inclure les frais de livraison
        // order.total contient uniquement le montant des articles
        const totalAmount = parseFloat(order.total || 0) || 0;
        return totalAmount.toFixed(2);
      })()}€`,
      icon: '/icon-192x192.png',
      tag: `order-${order.id}`,
      requireInteraction: true,
      badge: '/icon-192x192.png'
    });

    requestBrowserNotificationPermission();
    
    // Ajouter la notification avec un effet visuel
    // IMPORTANT: Afficher le montant total avec les frais de livraison pour correspondre au montant réel payé
    const totalWithDelivery = (parseFloat(order.total || 0) + parseFloat(order.frais_livraison || 0)).toFixed(2);
    const newNotification = {
      id: Date.now(),
      type: 'new_order',
      message: `Nouvelle commande #${order.id?.slice(0, 8) || 'N/A'} - ${totalWithDelivery}€`,
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

  // Fonction pour déclencher l'alerte de commande annulée
  const triggerCancellationAlert = (order) => {
    console.log('🚨 DÉCLENCHEMENT ALERTE - Commande annulée:', order.id);
    
    // Afficher une pop-up d'alerte pour annulation
    setAlertOrder(order);
    setShowAlert(true);
    setIsBlinking(true);
    
    // Jouer une alerte sonore (triple bip pour différencier d'une nouvelle commande)
    playCancellationSound();
    setTimeout(() => playCancellationSound(), 300);
    setTimeout(() => playCancellationSound(), 600);
    
    // Afficher une notification du navigateur
    showBrowserNotification('⚠️ COMMANDE ANNULÉE', {
      body: `La commande #${order.id?.slice(0, 8) || 'N/A'} a été annulée par le client`,
      icon: '/icon-192x192.png',
      tag: `order-cancelled-${order.id}`,
      requireInteraction: true,
      badge: '/icon-192x192.png'
    });
    
    // Ajouter la notification avec un effet visuel
    const newNotification = {
      id: Date.now(),
      type: 'order_cancelled',
      message: `Commande #${order.id?.slice(0, 8) || 'N/A'} annulée par le client`,
      data: order,
      timestamp: new Date().toISOString(),
      isNew: true
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    
    // Arrêter le clignotement après 15 secondes
    setTimeout(() => {
      setIsBlinking(false);
    }, 15000);
    
    // Auto-fermer la pop-up après 30 secondes
    setTimeout(() => {
      setShowAlert(false);
    }, 30000);
  };

  // Fonction pour jouer une alerte sonore d'annulation (son différent)
  const playCancellationSound = () => {
    if (!soundEnabled) {
      return;
    }
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          playCancellationSoundWithContext(audioContext);
        }).catch(() => {
          console.warn('Contexte audio suspendu pour annulation');
        });
        return;
      }
      
      playCancellationSoundWithContext(audioContext);
    } catch (error) {
      console.warn('Impossible de jouer le son d\'annulation:', error);
    }
  };

  // Fonction helper pour jouer le son d'annulation avec un contexte audio actif
  const playCancellationSoundWithContext = (audioContext) => {
    try {
      // Son plus grave et plus long pour différencier d'une nouvelle commande
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Son plus grave et plus long
      oscillator.frequency.value = 400; // Plus grave que le son de nouvelle commande
      oscillator.type = 'sine';
      
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.6, now + 0.02); // Attack plus fort
      gainNode.gain.linearRampToValueAtTime(0.4, now + 0.15);
      gainNode.gain.linearRampToValueAtTime(0.4, now + 0.4);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.5); // Plus long
      
      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } catch (error) {
      console.warn('Impossible de jouer le son d\'annulation avec AudioContext:', error);
    }
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

  const playHtmlAudioTone = () => {
    const base = audioElementRef.current;
    if (!base) return false;
    try {
      const playClone = () => {
        const clone = base.cloneNode(true);
        clone.volume = base.volume;
        clone.play().catch(() => {});
      };

      playClone();
      setTimeout(playClone, 180);
      return true;
    } catch (error) {
      console.warn('Impossible de jouer le son via l’élément audio:', error);
      return false;
    }
  };

  // Fonction pour jouer une alerte sonore
  const playNotificationSound = () => {
    if (!soundEnabled) {
      return;
    }
    if (playHtmlAudioTone()) {
      return;
    }
    try {
      let audioContext = audioContextRef.current;
      
      // Créer un nouveau contexte si nécessaire
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
      }
      
      // Toujours essayer de reprendre le contexte s'il est suspendu
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          // Continuer avec la lecture du son après la reprise
          playSoundWithContext(audioContext);
        }).catch(() => {
          // Si la résolution échoue, créer un nouveau contexte
          try {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            playSoundWithContext(audioContextRef.current);
          } catch (newContextError) {
            console.warn('Impossible de créer un nouveau contexte audio, utilisation du fallback');
            playFallbackSound();
          }
        });
        return;
      }
      
      // Si le contexte est actif, jouer le son directement
      playSoundWithContext(audioContext);
    } catch (error) {
      console.warn('Impossible de jouer le son avec AudioContext:', error);
      // Essayer le fallback
      try {
        playFallbackSound();
      } catch (fallbackError) {
        console.warn('Impossible de jouer le son de fallback:', fallbackError);
      }
    }
  };

  // Fonction helper pour jouer le son avec un contexte audio actif
  const playSoundWithContext = (audioContext) => {
    try {
      
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
    if (playHtmlAudioTone()) {
      return;
    }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = 850;
      osc.type = 'sine';
      
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.55, now + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (error) {
      console.warn('Impossible de jouer le son de fallback:', error);
    }
  };

  // Demander la permission pour les notifications du navigateur
  useEffect(() => {
    if (isNotificationSupported() && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Permission notification:', permission);
      }).catch((error) => {
        console.warn('Permission notification refusée ou non disponible:', error);
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
                          // IMPORTANT: Le prix affiché côté restaurant ne doit PAS inclure les frais de livraison
                          // order.total contient uniquement le montant des articles (chiffre d'affaires du restaurant)
                          const totalAmount = parseFloat(alertOrder.total || 0) || 0;
                          return totalAmount.toFixed(2);
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
                  // Ne pas utiliser pushState car cela peut causer des problèmes de navigation
                  setTimeout(() => {
                    const dashboardTab = document.querySelector('[data-tab="orders"]');
                    if (dashboardTab) {
                      dashboardTab.click();
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
      
      <div className="relative inline-flex">
      {/* Bouton notifications */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative flex items-center justify-center h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/90 dark:bg-gray-900 text-gray-600 dark:text-gray-300 shadow-md ring-1 ring-gray-200 dark:ring-gray-700 hover:text-gray-900 dark:hover:text-white hover:ring-blue-300 transition-all"
        aria-label="Notifications en temps réel"
      >
        <FaBell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
        {isConnected && (
          <span className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 bg-green-500 rounded-full h-2 w-2 ring-2 ring-white dark:ring-gray-900"></span>
        )}
      </button>

          {/* Panneau notifications */}
          {showNotifications && (
            <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-2 w-[min(18rem,calc(100vw-2.5rem))] sm:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50">
          <div className="p-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center mt-2">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isConnected ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Alerte sonore</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                />
                <div className={`w-10 h-5 sm:w-11 sm:h-6 rounded-full transition-colors duration-200 ${
                  soundEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                      soundEnabled ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0'
                    }`}
                  ></div>
                </div>
              </label>
            </div>
            <button
              onClick={() => {
                if (!soundEnabled) {
                  setSoundEnabled(true);
                  setTimeout(() => {
                    playNotificationSound();
                  }, 50);
                } else {
                  playNotificationSound();
                }
              }}
              className="mt-2 w-full text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              Tester le son
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <FaBell className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-700">
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
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(notification.timestamp).toLocaleTimeString('fr-FR')}
                          </p>
                          {notification.data && (
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                              <p>Commande #{notification.data.id}</p>
                              <p className="text-gray-500 dark:text-gray-400">Total: {notification.data.total_amount || notification.data.total}€</p>
                              <p className="text-green-600 dark:text-green-400 font-semibold">Votre gain: {((notification.data.total_amount || notification.data.total || 0) * 0.80).toFixed(2)}€</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
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
            <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <button
                onClick={() => setNotifications([])}
                className="w-full text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
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
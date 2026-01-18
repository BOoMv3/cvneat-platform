'use client';
import { useState, useEffect, useRef } from 'react';
import DeliveryNavbar from '../../components/DeliveryNavbar';
import AuthGuard from '@/components/AuthGuard';
import DeliveryNotifications from '@/components/DeliveryNotifications';
// // import RealDeliveryMap from '@/components/RealDeliveryMap';
import DeliveryChat from '@/components/DeliveryChat';
import OrderCountdown from '@/components/OrderCountdown';
import PreventiveAlert from '@/components/PreventiveAlert';
// import SafeGeolocationButton from '@/components/SafeGeolocationButton';
import { useRouter } from 'next/navigation';
import { FaCalendarAlt, FaMotorcycle, FaBoxOpen, FaCheckCircle, FaStar, FaDownload, FaChartLine, FaBell, FaComments } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import RealTimeNotifications from '../../components/DeliveryNotifications';

const isNotificationSupported = () => typeof window !== 'undefined' && 'Notification' in window;

const showDeliveryNotification = (title, options) => {
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      new Notification(title, options);
    } catch (error) {
      console.warn('Notification delivery non supportée:', error);
    }
  }
};

const requestDeliveryNotificationPermission = () => {
  if (isNotificationSupported() && Notification.permission === 'default') {
    try {
      Notification.requestPermission();
    } catch (error) {
      console.warn('Impossible de demander la permission de notification livraison:', error);
    }
  }
};

const getCustomerName = (order) => {
  if (!order) return 'Client';

  const firstName =
    order.customer_first_name ||
    order.customer_name_first ||
    order.users?.prenom ||
    '';
  const lastName =
    order.customer_last_name ||
    order.customer_name_last ||
    order.users?.nom ||
    '';

  let combined = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (!combined) {
    combined =
      order.customer_name ||
      [order.users?.prenom || '', order.users?.nom || ''].filter(Boolean).join(' ').trim() ||
      order.user_addresses?.name ||
      '';
  }

  return combined || 'Client';
};

const getCustomerPhone = (order) => {
  if (!order) return null;
  return (
    order.customer_phone ||
    order.users?.telephone ||
    order.delivery_phone ||
    order.user_addresses?.phone ||
    null
  );
};

const getCustomerEmail = (order) => {
  if (!order) return null;
  return (
    order.customer_email ||
    order.users?.email ||
    order.delivery_email ||
    null
  );
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export default function DeliveryDashboard() {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null); // Gardé pour compatibilité
  const [acceptedOrders, setAcceptedOrders] = useState([]); // Toutes les commandes acceptées
  const [selectedOrderId, setSelectedOrderId] = useState(null); // Commande sélectionnée pour voir les détails
  const [expandedOrders, setExpandedOrders] = useState(new Set()); // Commandes dont les détails sont développés
  const [stats, setStats] = useState({ total_earnings: 0, total_deliveries: 0, average_rating: 0 });
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [deliveryId, setDeliveryId] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertOrder, setAlertOrder] = useState(null);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioEnabledRef = useRef(false);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [preparationAlerts, setPreparationAlerts] = useState([]);
  const [preventiveAlerts, setPreventiveAlerts] = useState([]);
  const [pushRegistrationAttempted, setPushRegistrationAttempted] = useState(false);
  const [showDeliveryTimeModal, setShowDeliveryTimeModal] = useState(false);
  const [selectedOrderForAccept, setSelectedOrderForAccept] = useState(null);
  const [deliveryTime, setDeliveryTime] = useState(20);
  const [acceptingOrder, setAcceptingOrder] = useState(false);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  // Fonction pour calculer la distance entre deux points (formule de Haversine)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Fonction pour calculer un temps réaliste (en vélo/scooter en ville)
  const calculateRealisticTime = (distance) => {
    const averageSpeed = 20; // km/h en vélo/scooter en ville (réaliste)
    return Math.round((distance / averageSpeed) * 60); // en minutes
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          router.push('/login');
          return;
        }
        
        if (!user) {
          router.push('/login');
          return;
        }
        
        setUser(user);
        setDeliveryId(user.id);
        fetchAvailableOrders();
        fetchStats();
        fetchCurrentOrder();
        fetchPreparationAlerts();
        fetchPreventiveAlerts();
      } catch (error) {
        router.push('/login');
      }
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    if (!user || pushRegistrationAttempted) {
      return;
    }

    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !vapidPublicKey
    ) {
      return;
    }

    const registerPushSubscription = async () => {
      try {
        const registration =
          (await navigator.serviceWorker.getRegistration('/delivery-sw.js')) ||
          (await navigator.serviceWorker.register('/delivery-sw.js'));

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('Permission notification refusée');
          setPushRegistrationAttempted(true);
          return;
        }

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        await fetch('/api/delivery/push/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscription }),
        });
      } catch (error) {
        console.error('❌ Erreur enregistrement notifications push:', error);
      } finally {
        setPushRegistrationAttempted(true);
      }
    };

    registerPushSubscription();
  }, [user, pushRegistrationAttempted, vapidPublicKey]);

  // Système de géolocalisation en temps réel
  useEffect(() => {
    if (!currentOrder || currentOrder.statut !== 'en_livraison') {
      return;
    }

    let watchId = null;

    const updatePosition = async (position) => {
      try {
        const { latitude, longitude } = position.coords;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/delivery/update-position', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            latitude,
            longitude,
            orderId: currentOrder.id
          })
        });

        if (!response.ok) {
          // Erreur silencieuse
        }
      } catch (error) {
        // Erreur silencieuse
      }
    };

    // Démarrer le suivi GPS
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        updatePosition,
        () => {
          // Erreur géolocalisation silencieuse
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    }

    // Nettoyage
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [currentOrder]);

  // Rechargement automatique des commandes pour détecter les nouvelles et les commandes prises
  useEffect(() => {
    // Rafraîchir toutes les 3 secondes pour détecter rapidement les commandes prises par d'autres livreurs
    const interval = setInterval(() => {
      fetchAvailableOrders();
    }, 3000);
    
    // Rafraîchir les statistiques toutes les 30 secondes
    const statsInterval = setInterval(() => {
      fetchStats();
    }, 30000);

    // Rafraîchir les alertes de préparation toutes les 30 secondes
    const alertsInterval = setInterval(() => {
      fetchPreparationAlerts();
    }, 30000);

    // Rafraîchir les alertes préventives toutes les 10 secondes
    const preventiveInterval = setInterval(() => {
      fetchPreventiveAlerts();
    }, 10000);

    return () => {
      clearInterval(interval);
      clearInterval(statsInterval);
      clearInterval(alertsInterval);
      clearInterval(preventiveInterval);
    };
  }, []);

  // Initialiser l'audio context au chargement de la page
  useEffect(() => {
    const initAudio = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Créer un son silencieux pour activer l'audio
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.001);
        
      } catch (error) {
      }
    };

    // Initialiser l'audio après un court délai
    setTimeout(initAudio, 1000);
  }, []);

  const fetchWithAuth = async (url, options = {}) => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        // iOS/Capacitor: éviter cookies/credentials (on utilise Authorization)
        return fetch(url, { ...options, credentials: 'omit' });
      }
      
      const token = session?.access_token;

      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      // Envoyer le token dans l'header Authorization
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return fetch(url, { 
        ...options, 
        headers,
        // IMPORTANT: credentials=include + ACAO="*" => WKWebView peut échouer ("Load failed")
        credentials: 'omit'
      });
    } catch (error) {
      return fetch(url, { ...options, credentials: 'omit' });
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setAvailableOrders([]);
        return;
      }
      
      const response = await fetch('/api/delivery/available-orders', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      // S'assurer que data est un tableau
      if (response.ok) {
        if (Array.isArray(data)) {
          // Récupérer les IDs des commandes actuelles
          const currentOrderIds = new Set(data.map(order => order.id));
          
          // Détecter les commandes qui ont disparu (prises par un autre livreur)
          const previousOrderIds = new Set(availableOrders.map(order => order.id));
          const removedOrders = availableOrders.filter(order => !currentOrderIds.has(order.id));
          
          if (removedOrders.length > 0 && availableOrders.length > 0) {
            // Une ou plusieurs commandes ont été prises par un autre livreur
            console.log('⚠️ Commandes prises par d\'autres livreurs:', removedOrders.map(o => o.id));
            // Optionnel: afficher une notification discrète
            // Vous pouvez ajouter un toast ici si vous avez une bibliothèque de notifications
          }
          
          // Détecter les nouvelles commandes
          const newOrderIds = new Set(data.filter(order => !previousOrderIds.has(order.id)).map(order => order.id));
          const newOrders = data.filter(order => newOrderIds.has(order.id));
          
          if (newOrders.length > 0) {
            // Afficher une alerte pour chaque nouvelle commande
            newOrders.forEach(order => {
              showNewOrderAlert(order);
            });
          }
          
          // Si c'est le premier chargement et qu'il y a des commandes, afficher une alerte
          if (previousOrderCount === 0 && data.length > 0) {
            data.forEach(order => {
              showNewOrderAlert(order);
            });
          }
          
          setAvailableOrders(data);
          setPreviousOrderCount(data.length);
        } else {
          setAvailableOrders([]);
          setPreviousOrderCount(0);
        }
      } else {
        setAvailableOrders([]);
        setPreviousOrderCount(0);
      }
    } catch (error) {
      console.error('Erreur récupération commandes disponibles:', error);
      setAvailableOrders([]);
      setPreviousOrderCount(0);
    }
  };

  // Fonction pour activer/désactiver l'audio
  const toggleAudio = async () => {
    if (audioEnabled) {
      // Désactiver l'audio
      setAudioEnabled(false);
      audioEnabledRef.current = false;
    } else {
      // Activer l'audio
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Résumer l'audio context s'il est suspendu
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        setAudioEnabled(true);
        audioEnabledRef.current = true;
        
        // Attendre un peu que l'état soit mis à jour, puis jouer le son de test
        setTimeout(() => {
          playAlertSound(true); // Force le son
        }, 100);
      } catch (error) {
      }
    }
  };

  // Fonction pour jouer un son d'alerte
  const playAlertSound = (force = false) => {
    if (!audioEnabledRef.current && !force) {
      return;
    }

    try {
      // Créer un son d'alerte plus audible
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Résumer l'audio context s'il est suspendu
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Son d'alerte plus long et plus audible
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.6);

      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1.0);
      
    } catch (error) {
    }
  };

  // Fonction pour afficher une alerte de nouvelle commande
  const showNewOrderAlert = (order, forceSound = false) => {
    setAlertOrder(order);
    setShowAlert(true);
    
    // Utiliser la référence pour avoir l'état actuel
    if (audioEnabledRef.current) {
      playAlertSound(false);
    } else if (forceSound) {
      playAlertSound(true);
    }

    // Demander la permission pour les notifications
    requestDeliveryNotificationPermission();

    // Notification du navigateur
    showDeliveryNotification('Nouvelle commande disponible !', {
      body: `Commande #${order.id} - ${getCustomerName(order)} - ${order.total}€`,
      icon: '/icon-192x192.png',
      tag: 'new-order'
    });

    // Auto-fermer l'alerte après 10 secondes
    setTimeout(() => {
      setShowAlert(false);
      setAlertOrder(null);
    }, 10000);
  };

  const fetchCurrentOrder = async () => {
    try {
      console.log('🔍 Récupération commandes acceptées...');
      
      const response = await fetchWithAuth('/api/delivery/accepted-orders');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Erreur récupération commandes acceptées:", errorData);
        setAcceptedOrders([]);
        setCurrentOrder(null);
        setLoading(false);
        return;
      }

      const data = await response.json();
      const orders = data.orders || [];

      if (orders.length > 0) {
        console.log('✅ Commandes acceptées récupérées:', orders.length);
        setAcceptedOrders(orders);
        // Garder la première commande pour compatibilité avec l'ancien code
        setCurrentOrder(orders[0]);
      } else {
        console.log('ℹ️ Aucune commande acceptée trouvée');
        setAcceptedOrders([]);
        setCurrentOrder(null);
      }
      setLoading(false);
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des commandes acceptées:", error);
      setAcceptedOrders([]);
      setCurrentOrder(null);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth('/api/delivery/stats');
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
      } else {
        console.error('❌ Erreur API stats:', data);
      }
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des statistiques:", error);
    }
  };

  const fetchPreparationAlerts = async () => {
    try {
      const response = await fetchWithAuth('/api/delivery/preparation-alerts');
      const data = await response.json();
      
      if (response.ok) {
        setPreparationAlerts(data.alerts || []);
        
        // Alerte sonore si nouvelles alertes
        if (data.alerts && data.alerts.length > 0 && audioEnabledRef.current) {
          playNotificationSound();
        }
      } else {
        console.error('❌ Erreur API alertes préparation:', data);
      }
    } catch (error) {
      console.error("❌ Erreur récupération alertes préparation:", error);
    }
  };

  const fetchPreventiveAlerts = async () => {
    try {
      const response = await fetchWithAuth('/api/delivery/preventive-alerts');
      const data = await response.json();
      
      if (response.ok) {
        setPreventiveAlerts(data.alerts || []);
        
        // Alerte sonore si nouvelles alertes préventives
        if (data.alerts && data.alerts.length > 0 && audioEnabledRef.current) {
          playNotificationSound();
        }
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  const formatApiError = (error) => {
    if (!error) return 'Erreur inconnue';
    if (typeof error === 'string') return error;
    return (
      error.error ||
      error.message ||
      error.details ||
      error.reason ||
      'Erreur inconnue'
    );
  };

  const openDeliveryTimeModal = (order) => {
    setSelectedOrderForAccept(order);
    // Estimer le temps de livraison basé sur la distance si disponible
    const estimatedTime = order.distance ? calculateRealisticTime(order.distance) : 20;
    setDeliveryTime(estimatedTime);
    setShowDeliveryTimeModal(true);
  };

  const confirmAcceptOrder = async () => {
    if (!selectedOrderForAccept) return;
    
    try {
      setAcceptingOrder(true);
      console.log('📦 Acceptation commande avec temps de livraison:', selectedOrderForAccept.id, deliveryTime);
      
      const response = await fetchWithAuth(`/api/delivery/accept-order/${selectedOrderForAccept.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          delivery_time: deliveryTime
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Commande acceptée avec succès:', result);
        
        // Fermer le modal
        setShowDeliveryTimeModal(false);
        setSelectedOrderForAccept(null);
        
        // Retirer la commande de la liste des commandes disponibles immédiatement
        setAvailableOrders(prev => prev.filter(o => o.id !== selectedOrderForAccept.id));
        
        // Attendre un peu pour que la base de données soit mise à jour
        setTimeout(() => {
          console.log('🔄 Mise à jour des commandes acceptées...');
          fetchAvailableOrders();
          fetchCurrentOrder();
        }, 500); // Délai de 500ms pour laisser le temps à la BDD
        
        alert("Commande acceptée avec succès !");
      } else {
        const error = await response.json();
        console.error('❌ Erreur acceptation:', error);
        alert(`Erreur: ${formatApiError(error)}`);
      }
    } catch (error) {
      console.error('❌ Erreur acceptation commande:', error);
      alert(`Erreur: ${error.message || 'Erreur de connexion'}`);
    } finally {
      setAcceptingOrder(false);
    }
  };

  const acceptOrder = async (orderId) => {
    const order = availableOrders.find(o => o.id === orderId);
    if (order) {
      openDeliveryTimeModal(order);
    } else {
      alert('Commande introuvable');
    }
  };

  const markOrderAsPickedUp = async (orderId) => {
    try {
      const response = await fetchWithAuth(`/api/delivery/order/${orderId}/picked-up`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        alert("✅ Commande marquée comme récupérée ! Le client a été notifié.");
        
        // Mettre à jour la commande dans la liste des commandes acceptées
        setAcceptedOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, picked_up_at: new Date().toISOString() }
            : order
        ));
        
        // Rafraîchir les commandes
        fetchCurrentOrder();
      } else {
        const error = await response.json();
        alert(`Erreur: ${formatApiError(error)}`);
      }
    } catch (error) {
      alert(`Erreur: ${error.message || 'Erreur de connexion'}`);
    }
  };

  const completeDelivery = async (orderId, providedCode = null) => {
    try {
      // TOUJOURS demander le code au livreur - ne jamais l'utiliser automatiquement
      let securityCode = providedCode;
      
      if (!securityCode) {
        // Demander le code via prompt
        securityCode = prompt('🔐 Entrez le code de sécurité donné par le client (6 chiffres):');
        
        if (!securityCode) {
          alert('Code de sécurité requis pour finaliser la livraison');
          return;
        }
        
        // Vérifier que le code est au bon format (6 chiffres)
        if (!/^\d{6}$/.test(securityCode.trim())) {
          alert('Le code de sécurité doit être composé de 6 chiffres');
          return;
        }
      }
      
      const response = await fetchWithAuth(`/api/delivery/complete-delivery/${orderId}`, {
        method: 'POST',
        body: JSON.stringify({ securityCode })
      });

      if (response.ok) {
        const result = await response.json();
        alert("Livraison finalisée avec succès !");
        // Mettre à jour la liste des commandes acceptées en retirant celle qui vient d'être livrée
        setAcceptedOrders(prev => prev.filter(o => o.id !== orderId));
        setCurrentOrder(null);
        setChatOpen(false); // Fermer le chat après la livraison
        fetchStats();
        fetchAvailableOrders();
        fetchCurrentOrder();
      } else {
        const error = await response.json();
        alert(`Erreur: ${formatApiError(error)}`);
      }
    } catch (error) {
      alert(`Erreur: ${error.message || 'Erreur de connexion'}`);
    }
  };
  
  const toggleAvailability = async () => {
    try {
      const response = await fetchWithAuth('/api/delivery/availability', {
        method: 'PUT',
        body: JSON.stringify({ is_available: !isAvailable })
      });

      if (response.ok) {
        setIsAvailable(!isAvailable);
        alert(`Disponibilité mise à jour: ${!isAvailable ? 'En ligne' : 'Hors ligne'}`);
      } else {
        const error = await response.json();
        alert(`Erreur: ${formatApiError(error)}`);
      }
    } catch (error) {
      alert('Erreur lors du changement de disponibilité');
    }
  };

  const exportEarnings = async () => {
    try {
      const response = await fetchWithAuth('/api/delivery/export-earnings');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "rapport-gains.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const error = await response.json().catch(() => null);
        alert(`Erreur lors de l'exportation des gains: ${formatApiError(error)}`);
      }
    } catch (error) {
      alert("Erreur lors de l'exportation des gains");
    }
  };

  if (!user) {
    return <div>Chargement...</div>;
  }

  return (
    <AuthGuard allowedRoles={['delivery']}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
        <DeliveryNavbar />
        
        {/* Alerte de nouvelle commande */}
        {showAlert && alertOrder && (
          <div className="fixed top-2 left-2 right-2 sm:top-4 sm:right-4 sm:left-auto z-50 bg-green-500 text-white p-3 sm:p-4 rounded-lg shadow-lg animate-pulse max-w-sm mx-auto sm:mx-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">🔔 Nouvelle commande !</h3>
                <p className="text-sm">Commande #{alertOrder.id}</p>
                <p className="text-sm">{getCustomerName(alertOrder)} - {alertOrder.total}€</p>
                <p className="text-xs">{alertOrder.delivery_address}</p>
              </div>
              <button
                onClick={() => setShowAlert(false)}
                className="ml-4 text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Alertes préventives */}
        {preventiveAlerts.map((alert) => (
          <PreventiveAlert
            key={alert.id}
            order={alert}
            onAccept={(orderId) => {
              // Ici on peut accepter la commande directement
              acceptOrder(orderId);
            }}
            onDismiss={(orderId) => {
              // Ici on peut marquer l'alerte comme ignorée
            }}
          />
        ))}
        
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Header avec notifications */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard Livreur</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Gérez vos livraisons et suivez vos performances</p>
            </div>
            <div className="space-y-3 sm:space-y-0">
              <DeliveryNotifications deliveryId={deliveryId} />
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  onClick={toggleAudio}
                  className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation ${
                    audioEnabled 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  <span className="text-sm">{audioEnabled ? '🔊' : '🔇'}</span>
                  <span className="text-xs sm:text-sm">{audioEnabled ? 'Audio' : 'Audio'}</span>
                </button>
                
                <button
                  onClick={() => router.push('/delivery/history')}
                  className="flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation"
                >
                  <FaCalendarAlt className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Historique</span>
                </button>
                
                <button
                  onClick={() => router.push('/delivery/reviews')}
                  className="flex items-center justify-center space-x-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation"
                >
                  <FaStar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Avis</span>
                </button>
                
                <button
                  onClick={exportEarnings}
                  className="flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation"
                >
                  <FaDownload className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Export</span>
                </button>
              </div>
              
              <div className="flex items-center justify-center sm:justify-end space-x-2">
                <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">
                  {isAvailable ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
            </div>
          </div>

          {/* Statistiques améliorées */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs sm:text-sm font-medium">Livraisons à encaisser</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{stats?.total_deliveries || 0}</p>
                  <p className="text-blue-100 text-[10px] sm:text-xs mt-1">Total: {stats?.total_deliveries_all || 0}</p>
                </div>
                <div className="bg-blue-400 bg-opacity-30 p-2 sm:p-3 rounded-full">
                  <FaChartLine className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs sm:text-sm font-medium">Gains à encaisser</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{stats?.total_earnings?.toFixed(2) || 0}€</p>
                  <p className="text-green-100 text-[10px] sm:text-xs mt-1">Total: {stats?.total_earnings_all?.toFixed?.(2) ? stats.total_earnings_all.toFixed(2) : (stats?.total_earnings_all || 0).toFixed?.(2) || '0.00'}€</p>
                </div>
                <div className="bg-green-400 bg-opacity-30 p-2 sm:p-3 rounded-full">
                  <FaDownload className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-xs sm:text-sm font-medium">Note Moyenne</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{stats?.average_rating?.toFixed(1) || 0}/5</p>
                </div>
                <div className="bg-yellow-400 bg-opacity-30 p-2 sm:p-3 rounded-full">
                  <FaStar className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs sm:text-sm font-medium">Statut</p>
                  <p className="text-sm sm:text-lg lg:text-xl font-bold">{isAvailable ? 'Actif' : 'Inactif'}</p>
                </div>
                <div className="bg-purple-400 bg-opacity-30 p-2 sm:p-3 rounded-full">
                  <FaBell className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Disponibilité améliorée */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Statut de disponibilité</h3>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  {isAvailable ? 'Vous êtes actuellement disponible pour les livraisons' : 'Vous êtes actuellement indisponible'}
                </p>
              </div>
              <button
                onClick={toggleAvailability}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation ${
                  isAvailable
                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg'
                    : 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                }`}
              >
                <span className="text-sm sm:text-base">{isAvailable ? 'Se mettre indisponible' : 'Se mettre disponible'}</span>
              </button>
            </div>
          </div>

          {/* Commandes acceptées - Vue compacte avec détails */}
          {acceptedOrders.length > 0 && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Mes commandes acceptées ({acceptedOrders.length})</h2>
                <button
                  onClick={() => {
                    // Développer/réduire toutes les commandes
                    if (expandedOrders.size === acceptedOrders.length) {
                      setExpandedOrders(new Set());
                    } else {
                      setExpandedOrders(new Set(acceptedOrders.map(o => o.id)));
                    }
                  }}
                  className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  {expandedOrders.size === acceptedOrders.length ? 'Réduire tout' : 'Développer tout'}
                </button>
              </div>
              
              {/* Liste compacte des commandes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {acceptedOrders.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);
                  return (
                    <div key={order.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                      {/* En-tête compact */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          const newExpanded = new Set(expandedOrders);
                          if (isExpanded) {
                            newExpanded.delete(order.id);
                          } else {
                            newExpanded.add(order.id);
                          }
                          setExpandedOrders(newExpanded);
                          setSelectedOrderId(order.id);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                            Commande #{order.id.slice(0, 8)}...
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.statut === 'en_livraison' ? 'bg-blue-100 text-blue-800' : 
                            order.statut === 'pret_a_livrer' ? 'bg-green-100 text-green-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.statut === 'en_livraison' ? 'En livraison' : 
                             order.statut === 'pret_a_livrer' ? 'Prêt' : 'En préparation'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <p className="text-gray-600 font-medium">{order.restaurant?.nom || 'Restaurant'}</p>
                            <p className="text-gray-500 text-xs">{getCustomerName(order)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-600">{order.total?.toFixed(2)}€</p>
                            {order.security_code && (
                              <p className="text-xs text-gray-500 font-mono">Code: {order.security_code}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>📍 {(order.adresse_livraison || order.user_addresses?.address || order.delivery_address || 'Adresse')?.slice(0, 30)}...</span>
                          <span className={isExpanded ? 'transform rotate-180' : ''}>▼</span>
                        </div>
                      </div>
                      
                      {/* Détails développés */}
                      {isExpanded && (
                        <div className="border-t p-4 space-y-4 bg-gray-50">
                          {/* Informations restaurant */}
                          <div className="bg-white p-3 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-2 text-sm">🍽️ Restaurant</h4>
                            <p className="text-gray-700 font-medium text-sm">{order.restaurant?.nom || 'Restaurant'}</p>
                            <p className="text-gray-600 text-xs">{order.restaurant?.adresse || 'Adresse non disponible'}</p>
                          </div>
                          
                          {/* Informations client */}
                          <div className="bg-white p-3 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-2 text-sm">👤 Client</h4>
                            <p className="text-gray-700 font-medium text-sm">
                              {getCustomerName(order)}
                            </p>
                            <p className="text-gray-600 text-xs">{getCustomerPhone(order) || 'Téléphone non disponible'}</p>
                            {getCustomerEmail(order) && (
                              <p className="text-gray-500 text-xs break-all mt-1">
                                {getCustomerEmail(order)}
                              </p>
                            )}
                          </div>
                          
                          {/* Adresse de livraison */}
                          <div className="bg-white p-3 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-2 text-sm">🏠 Adresse de livraison</h4>
                            <p className="text-gray-700 text-sm">
                              {order.adresse_livraison || order.user_addresses?.address || 'Adresse non disponible'}
                            </p>
                            {(order.ville_livraison || order.code_postal_livraison || order.user_addresses?.city || order.user_addresses?.postal_code) && (
                              <p className="text-gray-600 text-xs">
                                {order.ville_livraison || order.user_addresses?.city || ''} {order.code_postal_livraison || order.user_addresses?.postal_code || ''}
                              </p>
                            )}
                            {(order.instructions_livraison || order.user_addresses?.instructions) && (
                              <p className="text-gray-500 text-xs mt-1 italic">
                                Instructions: {order.instructions_livraison || order.user_addresses?.instructions}
                              </p>
                            )}
                          </div>
                          
                          {/* Timer de préparation - affiché pour toutes les commandes acceptées */}
                          {order.preparation_time && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-orange-800 mb-1 text-sm">⏰ Temps de préparation</h4>
                                  <p className="text-xs text-orange-600">
                                    {order.statut === 'en_preparation' ? 'Commande en préparation' : 
                                     order.statut === 'pret_a_livrer' ? 'Commande prête' : 
                                     'En livraison'} - {order.preparation_time} min estimées
                                  </p>
                                </div>
                                <OrderCountdown 
                                  order={order} 
                                  onTimeUp={(orderId) => {
                                    // Optionnel : notification ou action
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Code de sécurité */}
                          {order.security_code && (
                            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-blue-800 mb-1 text-sm">🔐 Code de sécurité</h4>
                                  <p className="text-xs text-blue-600">À demander au client</p>
                                </div>
                                <div className="text-xl font-mono font-bold text-blue-800 bg-white px-3 py-2 rounded-lg border-2 border-blue-400">
                                  {order.security_code}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Boutons de navigation */}
                          <div className="space-y-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const restaurant = encodeURIComponent(order.restaurant?.adresse || '');
                                const delivery = encodeURIComponent(order.adresse_livraison || order.user_addresses?.address || order.delivery_address || '');
                                const url = `https://www.google.com/maps/dir/${restaurant}/${delivery}`;
                                window.open(url, '_blank');
                              }}
                              className="w-full py-2 px-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-sm"
                            >
                              🗺️ Navigation (Restaurant → Livraison)
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Vérifier que la géolocalisation est supportée
                                if (!navigator.geolocation) {
                                  alert('Géolocalisation non supportée par votre navigateur');
                                  return;
                                }
                                
                                // Vérifier la permission avant de demander la position
                                navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
                                  if (result.state === 'denied') {
                                    alert('L\'accès à la géolocalisation a été refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
                                    return;
                                  }
                                  
                                  // Demander la position (seulement après interaction utilisateur)
                                  navigator.geolocation.getCurrentPosition(
                                    (position) => {
                                      const lat = position.coords.latitude;
                                      const lng = position.coords.longitude;
                                      const delivery = encodeURIComponent(order.adresse_livraison || order.user_addresses?.address || order.delivery_address || '');
                                      const url = `https://www.google.com/maps/dir/${lat},${lng}/${delivery}`;
                                      window.open(url, '_blank');
                                    },
                                    (error) => {
                                      console.error('Erreur géolocalisation:', error);
                                      let errorMessage = 'Impossible d\'accéder à votre position. ';
                                      if (error.code === error.PERMISSION_DENIED) {
                                        errorMessage += 'L\'accès à la géolocalisation a été refusé.';
                                      } else if (error.code === error.POSITION_UNAVAILABLE) {
                                        errorMessage += 'Position non disponible.';
                                      } else if (error.code === error.TIMEOUT) {
                                        errorMessage += 'Délai d\'attente dépassé.';
                                      } else {
                                        errorMessage += 'Erreur inconnue.';
                                      }
                                      errorMessage += ' Utilisez "Navigation complète" à la place.';
                                      alert(errorMessage);
                                    },
                                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                                  );
                                }).catch(() => {
                                  // Si permissions API n'est pas supporté, essayer quand même
                                  navigator.geolocation.getCurrentPosition(
                                    (position) => {
                                      const lat = position.coords.latitude;
                                      const lng = position.coords.longitude;
                                      const delivery = encodeURIComponent(order.adresse_livraison || order.user_addresses?.address || order.delivery_address || '');
                                      const url = `https://www.google.com/maps/dir/${lat},${lng}/${delivery}`;
                                      window.open(url, '_blank');
                                    },
                                    (error) => {
                                      console.error('Erreur géolocalisation:', error);
                                      alert('Impossible d\'accéder à votre position. Utilisez "Navigation complète" à la place.');
                                    },
                                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                                  );
                                });
                              }}
                              className="w-full py-2 px-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-sm"
                            >
                              🌍 Navigation depuis ma position
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const delivery = encodeURIComponent(order.adresse_livraison || order.user_addresses?.address || order.delivery_address || '');
                                const url = `https://waze.com/ul?q=${delivery}`;
                                window.open(url, '_blank');
                              }}
                              className="w-full py-2 px-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold text-sm"
                            >
                              🚗 Ouvrir dans Waze
                            </button>
                          </div>
                          
                          {/* Bouton "J'ai récupéré la commande" */}
                          {(order.statut === 'en_livraison' || order.statut === 'pret_a_livrer' || order.statut === 'en_preparation') && !order.picked_up_at && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markOrderAsPickedUp(order.id);
                              }}
                              className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm mb-2"
                            >
                              📦 J'ai récupéré la commande
                            </button>
                          )}
                          
                          {/* Indicateur que la commande a été récupérée */}
                          {order.picked_up_at && (
                            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-sm text-blue-800 font-semibold">
                                ✅ Commande récupérée
                              </p>
                              <p className="text-xs text-blue-600">
                                {new Date(order.picked_up_at).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          )}
                          
                          {/* Bouton marquer comme livrée */}
                          {(order.statut === 'en_livraison' || order.statut === 'pret_a_livrer' || order.statut === 'en_preparation') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                completeDelivery(order.id);
                              }}
                              className="w-full py-2 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm"
                            >
                              ✅ Marquer comme livrée
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alertes de préparation */}
          {preparationAlerts.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl shadow-sm mb-6">
              <div className="p-4 sm:p-6 border-b border-orange-200">
                <h2 className="text-lg sm:text-xl font-semibold text-orange-800 flex items-center">
                  <FaBell className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Alertes de préparation
                </h2>
                <p className="text-orange-600 mt-1 text-sm sm:text-base">Commandes bientôt prêtes à récupérer</p>
              </div>
              <div className="divide-y divide-orange-200">
                {preparationAlerts.map((alert) => (
                  <div key={alert.order_id} className="p-4 hover:bg-orange-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold text-orange-900">
                            Commande #{alert.order_id}
                          </span>
                          <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full">
                            {alert.time_remaining_minutes} min restantes
                          </span>
                        </div>
                        <p className="text-orange-800 text-sm">
                          <strong>Client:</strong> {getCustomerName(alert)}
                        </p>
                        <p className="text-orange-800 text-sm">
                          <strong>Restaurant:</strong> {alert.restaurant_name}
                        </p>
                        <p className="text-orange-800 text-sm">
                          <strong>Adresse:</strong> {alert.restaurant_address}
                        </p>
                        <p className="text-orange-800 text-sm">
                          <strong>Total:</strong> {alert.total_price}€
                        </p>
                        {alert.security_code && (
                          <p className="text-orange-800 text-sm">
                            <strong>Code:</strong> 
                            <span className="ml-1 font-mono bg-orange-200 px-2 py-1 rounded">
                              {alert.security_code}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-orange-600 text-sm">
                          Temps de préparation: {alert.preparation_time} min
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Commandes disponibles améliorées */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Commandes disponibles</h2>
              <p className="text-gray-600 mt-1">Acceptez une nouvelle livraison</p>
            </div>
            <div className="divide-y">
              {!Array.isArray(availableOrders) || availableOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaBell className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium">Aucune commande disponible</p>
                  <p className="text-sm">Les nouvelles commandes apparaîtront ici</p>
                </div>
              ) : null}
              
              {Array.isArray(availableOrders) && availableOrders.length > 0 && (
                <div>
                  {availableOrders.map((order, index) => {
                    return (
                      <div key={`order-${order.id}-${index}`} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                #{order.id || 'N/A'}
                              </span>
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                {order.frais_livraison || 'N/A'}€
                              </span>
                              <span className="text-sm text-gray-500">
                                {order.created_at ? new Date(order.created_at).toLocaleTimeString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                }) : 'N/A'}
                              </span>
                            </div>
                          
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-1 text-sm">🍽️ Restaurant</h4>
                                <p className="text-gray-700 font-medium text-sm">{order.restaurant?.nom || order.restaurant_nom || 'N/A'}</p>
                                <p className="text-gray-600 text-xs">{order.restaurant?.adresse || order.restaurant_adresse || 'N/A'}</p>
                              </div>
                              
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-1 text-sm">🏠 Livraison</h4>
                                <p className="text-gray-700 font-medium text-sm">{getCustomerName(order)}</p>
                                <p className="text-gray-600 text-xs">{order.delivery_address || 'N/A'}</p>
                                {getCustomerPhone(order) && (
                                  <p className="text-gray-500 text-xs mt-1">📞 {getCustomerPhone(order)}</p>
                                )}
                                {getCustomerEmail(order) && (
                                  <p className="text-gray-400 text-xs mt-1 break-all">✉️ {getCustomerEmail(order)}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                              <span>Total: {order.total || 'N/A'}€</span>
                              <span>Frais: {order.frais_livraison || 'N/A'}€</span>
                              <span>Est. {order.preparation_time || 'N/A'} min</span>
                            </div>
                          
                          {/* Décompte en temps réel - affiché pour toutes les commandes avec temps de préparation */}
                          {order.preparation_time && (order.statut === 'en_preparation' || order.statut === 'pret_a_livrer' || order.statut === 'en_livraison') && (
                            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-orange-800">⏰ Temps de préparation</h4>
                                  <p className="text-sm text-orange-600">
                                    {order.statut === 'en_preparation' ? 'Commande en préparation' : 
                                     order.statut === 'pret_a_livrer' ? 'Commande prête' : 
                                     'En livraison'} - {order.preparation_time} min estimées
                                  </p>
                                </div>
                                <OrderCountdown 
                                  order={order} 
                                  onTimeUp={(orderId) => {
                                    // Optionnel : notification ou action
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col gap-2">
                          {(order.statut === 'en_attente' || order.statut === 'pret_a_livrer' || order.statut === 'en_preparation') ? (
                            // Dans le nouveau workflow, le livreur accepte les commandes 'en_attente'
                            <button
                              onClick={() => acceptOrder(order.id)}
                              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 transform hover:scale-105 font-semibold shadow-lg text-sm min-h-[44px] touch-manipulation"
                            >
                              ✅ Accepter
                            </button>
                          ) : order.statut === 'en_livraison' && order.livreur_id === user?.id ? (
                            // Commande acceptée par ce livreur - SEUL ce livreur peut la livrer
                            <div className="flex flex-col gap-2">
                              <span className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold text-xs text-center">
                                📦 En cours
                              </span>
                              <button
                                onClick={() => completeDelivery(order.id)}
                                className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm min-h-[44px] touch-manipulation"
                              >
                                🚚 Livrer
                              </button>
                            </div>
                          ) : order.statut === 'en_livraison' && order.livreur_id !== user?.id ? (
                            // Commande acceptée par un autre livreur - AUCUNE action possible
                            <span className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-xs text-center">
                              👤 Autre livreur
                            </span>
                          ) : order.statut === 'livree' ? (
                            // Commande déjà livrée
                            <span className="px-3 py-2 bg-green-100 text-green-800 rounded-lg font-semibold text-xs text-center">
                              ✅ Livrée
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
        </main>

        {/* Chat Modal */}
        {currentOrder && (
          <DeliveryChat
            orderId={currentOrder.id}
            customerName={`${currentOrder.users?.prenom} ${currentOrder.users?.nom}`}
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />
        )}

        {/* Modal pour saisir le temps de livraison */}
        {showDeliveryTimeModal && selectedOrderForAccept && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-3">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Accepter la commande</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Indiquez le temps de livraison estimé (en minutes). Pensez à vos autres courses en cours.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temps de livraison estimé (minutes)
                </label>
                
                {/* Boutons rapides pour les temps courants - Plus d'options */}
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 120].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setDeliveryTime(time)}
                      className={`px-2 py-2 text-xs sm:text-sm font-medium rounded-lg border transition-colors ${
                        deliveryTime === time
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                
                {/* Input manuel pour temps personnalisé - Plus visible */}
                <div className="mb-2">
                  <label className="block text-xs text-gray-600 mb-1">Ou saisissez un temps personnalisé (5-180 min)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(Math.max(5, Math.min(180, parseInt(e.target.value) || 20)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="Ex: 25"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Temps estimé pour livrer cette commande (en tenant compte de vos autres courses)
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeliveryTimeModal(false);
                    setSelectedOrderForAccept(null);
                    setDeliveryTime(20);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmAcceptOrder}
                  disabled={acceptingOrder}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {acceptingOrder ? 'Acceptation...' : 'Accepter'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 
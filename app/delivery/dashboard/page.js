'use client';

import { getDeliverySlotSummaryLine } from '@/lib/delivery-slots';
import { livreurEarningNetEur } from '@/lib/livreur-delivery-earnings';
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
import { FaCalendarAlt, FaMotorcycle, FaBoxOpen, FaCheckCircle, FaStar, FaDownload, FaChartLine, FaBell, FaComments, FaFileInvoice, FaUserCog, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import RealTimeNotifications from '../../components/DeliveryNotifications';
import { safeLocalStorage } from '@/lib/localStorage';

const DRIVER_FLOW_INFO_KEY = 'cvneat-driver-prepay-flow-v1';

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
  const [showPrepayFlowInfo, setShowPrepayFlowInfo] = useState(true);
  const [preventiveAlerts, setPreventiveAlerts] = useState([]);
  const [pushRegistrationAttempted, setPushRegistrationAttempted] = useState(false);
  const [showDeliveryTimeModal, setShowDeliveryTimeModal] = useState(false);
  const [selectedOrderForAccept, setSelectedOrderForAccept] = useState(null);
  const [deliveryTime, setDeliveryTime] = useState(20);
  const [acceptingOrder, setAcceptingOrder] = useState(false);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const dismissed = safeLocalStorage.getItem(DRIVER_FLOW_INFO_KEY);
    if (dismissed === '1') setShowPrepayFlowInfo(false);
  }, []);

  const dismissPrepayFlowInfo = () => {
    safeLocalStorage.setItem(DRIVER_FLOW_INFO_KEY, '1');
    setShowPrepayFlowInfo(false);
  };

  // Gain net livreur (API masque le montant client ; préfère `gain` déjà calculé)
  const getOrderGain = (order) => {
    if (order?.gain != null && order.gain !== '' && !Number.isNaN(Number(order.gain))) {
      return Number(order.gain);
    }
    if (order?.delivery_fee != null && order.delivery_fee !== '' && !Number.isNaN(Number(order.delivery_fee))) {
      return Number(order.delivery_fee);
    }
    return livreurEarningNetEur(order);
  };

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
        // Utiliser getSession() en premier (cache local, plus rapide) pour éviter blocage "Chargement..."
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setDeliveryId(session.user.id);
          fetchAvailableOrders();
          fetchStats();
          fetchCurrentOrder();
          fetchPreparationAlerts();
          fetchPreventiveAlerts();
          return;
        }
        // Fallback: getUser() si pas de session en cache
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
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

  // Rechargement automatique (intervalles allongés pour limiter la charge CPU / quota Vercel)
  // Pas de polling quand l'onglet est en arrière-plan
  useEffect(() => {
    const POLL_ORDERS_MS = 20000;   // 20 s (commandes disponibles)
    const POLL_STATS_MS = 60000;    // 60 s (gains)
    const POLL_ALERTS_MS = 60000;   // 60 s (alertes prépa)
    const POLL_PREVENTIVE_MS = 45000; // 45 s (alertes préventives)

    const maybeFetch = (fn) => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') fn();
    };

    const interval = setInterval(() => maybeFetch(fetchAvailableOrders), POLL_ORDERS_MS);
    const statsInterval = setInterval(() => maybeFetch(fetchStats), POLL_STATS_MS);
    const alertsInterval = setInterval(() => maybeFetch(fetchPreparationAlerts), POLL_ALERTS_MS);
    const preventiveInterval = setInterval(() => maybeFetch(fetchPreventiveAlerts), POLL_PREVENTIVE_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats();
        fetchAvailableOrders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      clearInterval(statsInterval);
      clearInterval(alertsInterval);
      clearInterval(preventiveInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  // iOS/Capacitor: au retour du background, WKWebView peut reprendre dans un état cassé.
  // On force un "refresh data" dès que l'app redevient active (sans devoir killer l'app).
  useEffect(() => {
    const isCapacitorApp =
      typeof window !== 'undefined' &&
      (window.location?.protocol === 'capacitor:' ||
        window.location?.href?.startsWith('capacitor://') ||
        !!window.Capacitor);

    if (!isCapacitorApp) return;

    let cancelled = false;
    let removeAppListener = null;
    const refreshingRef = { current: false };

    const refreshAll = async (reason) => {
      if (cancelled) return;
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      try {
        console.log('🔄 [DeliveryDashboard] Resume refresh:', reason);

        const { data: { user: u }, error } = await supabase.auth.getUser();
        if (error || !u) {
          router.replace('/login?redirect=/delivery/dashboard');
          return;
        }
        setUser(u);
        setDeliveryId(u.id);

        // Relancer les fetchs principaux
        await Promise.allSettled([
          fetchAvailableOrders(),
          fetchStats(),
          fetchCurrentOrder(),
          fetchPreparationAlerts(),
          fetchPreventiveAlerts(),
        ]);
      } catch (e) {
        console.warn('⚠️ [DeliveryDashboard] Resume refresh error:', e?.message || e);
      } finally {
        refreshingRef.current = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshAll('visibilitychange');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Capacitor AppStateChange (plus fiable que visibilitychange)
    (async () => {
      try {
        // Ne pas importer @capacitor/app côté web (sinon Next/Vercel échoue au build).
        // En app native, Capacitor expose les plugins via window.Capacitor.Plugins.
        const AppPlugin = window.Capacitor?.Plugins?.App;
        if (AppPlugin?.addListener) {
          const listener = await AppPlugin.addListener('appStateChange', ({ isActive }) => {
            if (isActive) refreshAll('appStateChange');
          });
          removeAppListener = () => listener.remove();
        }
      } catch (e) {
        // ignore (web)
      }
    })();

    // Refresh immédiat au montage (dans l'app) pour éviter écran figé après reload WebView
    refreshAll('mount');

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        removeAppListener && removeAppListener();
      } catch {
        // ignore
      }
    };
  }, [router]);

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
      body: `Commande #${order.id} - ${getCustomerName(order)} - ton gain ${getOrderGain(order).toFixed(2)}€`,
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
      const response = await fetchWithAuth(`/api/delivery/stats?t=${Date.now()}`, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
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
        
        // Mise à jour optimiste: ajouter immédiatement la commande acceptée à la liste
        // (évite que la course "disparaisse" avant que fetchCurrentOrder ne revienne)
        if (result.order) {
          const enrichedOrder = {
            ...result.order,
            customer_name: getCustomerName(result.order),
            customer_phone: getCustomerPhone(result.order),
            customer_email: getCustomerEmail(result.order),
          };
          setAcceptedOrders(prev => {
            const exists = prev.some(o => o.id === enrichedOrder.id);
            if (exists) return prev.map(o => o.id === enrichedOrder.id ? enrichedOrder : o);
            return [enrichedOrder, ...prev];
          });
          setCurrentOrder(enrichedOrder);
        }
        
        // Rafraîchir en arrière-plan pour avoir les données complètes
        setTimeout(() => {
          fetchAvailableOrders();
          fetchCurrentOrder();
        }, 500);
        
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
      <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-gray-50 to-gray-50 text-gray-900">
        <DeliveryNavbar />
        
        {/* Alerte de nouvelle commande */}
        {showAlert && alertOrder && (
          <div className="fixed top-2 left-2 right-2 sm:top-4 sm:right-4 sm:left-auto z-50 bg-orange-500 text-white p-3 sm:p-4 rounded-2xl shadow-xl animate-pulse max-w-sm mx-auto sm:mx-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Nouvelle course</h3>
                <p className="text-sm opacity-90">#{String(alertOrder.id).slice(0, 8)}</p>
                <p className="text-sm font-semibold">{getCustomerName(alertOrder)} — {getOrderGain(alertOrder).toFixed(2)} €</p>
                <p className="text-xs opacity-80">{alertOrder.delivery_address}</p>
              </div>
              <button
                onClick={() => setShowAlert(false)}
                className="ml-4 text-white hover:text-orange-100"
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
              acceptOrder(orderId);
            }}
            onDismiss={(orderId) => {
            }}
          />
        ))}
        
        <main className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-8">
          {/* Header pro */}
          <div className="mb-5 sm:mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Espace livreur</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">Courses, gains et statut en un coup d&apos;œil</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DeliveryNotifications deliveryId={deliveryId} />
              <button
                onClick={toggleAudio}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold min-h-[44px] touch-manipulation ${
                  audioEnabled
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                {audioEnabled ? '🔊' : '🔇'} Son
              </button>
              <button
                onClick={toggleAvailability}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold min-h-[44px] touch-manipulation ${
                  isAvailable
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-900 text-white hover:bg-black'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${isAvailable ? 'bg-white animate-pulse' : 'bg-red-400'}`} />
                {isAvailable ? 'En ligne' : 'Hors ligne'}
              </button>
            </div>
          </div>

          {/* Accès rapide */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
            <button
              type="button"
              onClick={() => router.push('/delivery/messages')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-3 sm:p-4 bg-orange-500 text-white rounded-2xl shadow-md shadow-orange-500/20 hover:bg-orange-600 min-h-[72px] touch-manipulation"
            >
              <FaComments className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-semibold">Messages</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/delivery/factures')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-3 sm:p-4 bg-gray-900 text-white rounded-2xl shadow hover:bg-black min-h-[72px] touch-manipulation"
            >
              <FaFileInvoice className="h-5 w-5" />
              <span className="text-xs sm:text-sm font-semibold">Factures</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/delivery/profile')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-3 sm:p-4 bg-white text-gray-900 border border-orange-100 rounded-2xl shadow-sm hover:border-orange-300 min-h-[72px] touch-manipulation"
            >
              <FaUserCog className="h-5 w-5 text-orange-500" />
              <span className="text-xs sm:text-sm font-semibold">Profil</span>
            </button>
          </div>

          {showPrepayFlowInfo && (
            <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5 relative shadow-sm">
              <button
                type="button"
                onClick={dismissPrepayFlowInfo}
                className="absolute top-3 right-3 p-2 text-orange-700/70 hover:text-orange-900 hover:bg-orange-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                aria-label="Fermer"
                title="J’ai compris"
              >
                <FaTimes className="h-4 w-4" />
              </button>
              <div className="flex gap-3 pr-10">
                <div className="shrink-0 mt-0.5">
                  <FaInfoCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-orange-950">
                    Nouveau fonctionnement des courses
                  </h2>
                  <ol className="mt-2 space-y-1.5 text-sm text-orange-950/90 list-decimal list-inside">
                    <li>
                      Le client <strong>cherche un livreur avant de payer</strong>.
                    </li>
                    <li>
                      Tu reçois une notif / vois la course → tu <strong>acceptes</strong>.
                    </li>
                    <li>
                      La commande <strong>n’apparaît pas tout de suite</strong> dans tes courses en cours.
                    </li>
                    <li>
                      Elle s’affiche <strong>une fois le paiement du client validé</strong> — tu peux alors aller au restaurant.
                    </li>
                  </ol>
                  <button
                    type="button"
                    onClick={dismissPrepayFlowInfo}
                    className="mt-3 inline-flex items-center px-3 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 min-h-[44px] touch-manipulation"
                  >
                    J’ai compris
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats brand */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div className="rounded-2xl bg-gray-900 p-4 sm:p-5 text-white shadow-lg">
              <p className="text-xs font-semibold text-gray-400">À encaisser</p>
              <p className="mt-1 text-2xl sm:text-3xl font-black tracking-tight">{stats?.total_deliveries || 0}</p>
              <p className="mt-1 text-[11px] text-gray-400">Total {stats?.total_deliveries_all || 0} courses</p>
            </div>
            <div className="rounded-2xl bg-orange-500 p-4 sm:p-5 text-white shadow-lg shadow-orange-500/25">
              <p className="text-xs font-semibold text-orange-100">Gains</p>
              <p className="mt-1 text-2xl sm:text-3xl font-black tracking-tight">{Number(stats?.total_earnings || 0).toFixed(2)} €</p>
              <p className="mt-1 text-[11px] text-orange-100/90">En attente de virement</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white p-4 sm:p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">Note</p>
              <p className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-gray-900">{Number(stats?.average_rating || 0).toFixed(1)}<span className="text-base text-gray-400">/5</span></p>
              <p className="mt-1 text-[11px] text-gray-500">Avis clients</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white p-4 sm:p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">Statut</p>
              <p className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-gray-900">{isAvailable ? 'Actif' : 'Pause'}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button onClick={() => router.push('/delivery/history')} className="text-[11px] font-semibold text-orange-600 hover:underline">Historique</button>
                <button onClick={() => router.push('/delivery/reviews')} className="text-[11px] font-semibold text-orange-600 hover:underline">Avis</button>
                <button onClick={exportEarnings} className="text-[11px] font-semibold text-orange-600 hover:underline">Export</button>
              </div>
            </div>
          </div>

          {/* Disponibilité */}
          <div className="rounded-2xl border border-orange-100 bg-white p-4 sm:p-5 mb-5 sm:mb-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Disponibilité</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  {isAvailable ? 'Tu reçois les nouvelles courses' : 'Tu n’es pas proposé pour les courses'}
                </p>
              </div>
              <button
                onClick={toggleAvailability}
                className={`px-5 py-3 rounded-xl font-bold min-h-[44px] touch-manipulation ${
                  isAvailable
                    ? 'bg-gray-900 text-white hover:bg-black'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {isAvailable ? 'Passer hors ligne' : 'Passer en ligne'}
              </button>
            </div>
          </div>

          {/* Commandes acceptées - Vue compacte avec détails */}
          {acceptedOrders.length > 0 && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-black text-gray-900">Mes courses ({acceptedOrders.length})</h2>
                <button
                  onClick={() => {
                    if (expandedOrders.size === acceptedOrders.length) {
                      setExpandedOrders(new Set());
                    } else {
                      setExpandedOrders(new Set(acceptedOrders.map(o => o.id)));
                    }
                  }}
                  className="text-sm px-3 py-1.5 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition-colors font-semibold"
                >
                  {expandedOrders.size === acceptedOrders.length ? 'Réduire tout' : 'Développer tout'}
                </button>
              </div>
              
              {/* Liste compacte des commandes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {acceptedOrders.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);
                  return (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                      {/* En-tête compact */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-orange-50/50 transition-colors"
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
                            <p className="font-bold text-green-600">{getOrderGain(order).toFixed(2)}€</p>
                            <p className="text-[10px] text-gray-500">Ton gain</p>
                            {order.security_code && (
                              <p className="text-xs text-gray-500 font-mono">Code: {order.security_code}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>📍 {(order.adresse_livraison || order.user_addresses?.address || order.delivery_address || 'Adresse')?.slice(0, 30)}...</span>
                          <span className={isExpanded ? 'transform rotate-180' : ''}>▼</span>
                        </div>
                        {getDeliverySlotSummaryLine(order) && (
                          <p className="mt-1 text-xs font-semibold text-orange-700">
                            🕐 {getDeliverySlotSummaryLine(order)}
                          </p>
                        )}
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
                          <strong>Ton gain:</strong> {(alert.gain ?? alert.delivery_fee)}€
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

          {/* Commandes disponibles — style app pro */}
          <div className="mb-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-gray-900">Courses disponibles</h2>
                <p className="text-sm text-gray-600 mt-0.5">Accepte une course pour commencer</p>
              </div>
              {Array.isArray(availableOrders) && availableOrders.length > 0 ? (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                  {availableOrders.length}
                </span>
              ) : null}
            </div>

            {!Array.isArray(availableOrders) || availableOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                  <FaMotorcycle className="h-7 w-7" />
                </div>
                <p className="text-lg font-bold text-gray-900">Aucune course pour le moment</p>
                <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                  Reste en ligne : les nouvelles courses apparaissent ici. Après acceptation, elles passent en cours une fois le paiement client validé.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {availableOrders.map((order, index) => {
                  const gain = getOrderGain(order);
                  const resto =
                    order.restaurant?.nom || order.restaurant_nom || 'Restaurant';
                  const dest = order.delivery_address || 'Adresse client';
                  const shortId = String(order.id || '').slice(0, 8) || 'N/A';
                  return (
                    <div
                      key={`order-${order.id}-${index}`}
                      className="relative overflow-hidden rounded-3xl bg-gray-900 p-5 text-white shadow-xl shadow-orange-500/10"
                    >
                      <div className="mb-3 flex items-center justify-between text-sm text-gray-300">
                        <span className="font-semibold">Course disponible</span>
                        <span className="font-mono text-xs text-gray-400">#{shortId}</span>
                      </div>
                      <p className="text-4xl font-black tracking-tight">{gain.toFixed(2)} €</p>
                      <p className="mt-1 text-sm text-gray-400">Ton gain net</p>

                      {order.prepay_search ? (
                        <span className="mt-3 inline-flex rounded-full bg-orange-500/20 px-2.5 py-1 text-[11px] font-bold text-orange-300">
                          Client attend pour payer
                        </span>
                      ) : null}

                      <div className="mt-4 space-y-2">
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Restaurant</p>
                          <p className="text-sm font-semibold text-white">{resto}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{order.restaurant?.adresse || order.restaurant_adresse || ''}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Livraison</p>
                          <p className="text-sm font-semibold text-white">{getCustomerName(order)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{dest}</p>
                        </div>
                      </div>

                      {getDeliverySlotSummaryLine(order) ? (
                        <p className="mt-3 text-xs font-semibold text-orange-300">
                          Créneau : {getDeliverySlotSummaryLine(order)}
                        </p>
                      ) : null}

                      <div className="mt-5">
                        {(order.statut === 'en_attente' || order.statut === 'pret_a_livrer' || order.statut === 'en_preparation') ? (
                          <button
                            onClick={() => acceptOrder(order.id)}
                            className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white hover:bg-orange-600 min-h-[48px] touch-manipulation"
                          >
                            Accepter la course
                          </button>
                        ) : order.statut === 'en_livraison' && order.livreur_id === user?.id ? (
                          <button
                            onClick={() => completeDelivery(order.id)}
                            className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white hover:bg-orange-600 min-h-[48px]"
                          >
                            Marquer livrée
                          </button>
                        ) : (
                          <span className="block text-center text-sm text-gray-400 py-2">Indisponible</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 border border-orange-100">
              <div>
                <h2 className="text-xl font-black text-gray-900">Accepter la course</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Indique le temps de livraison estimé (en minutes). Pense à tes autres courses en cours.
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
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50'
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
                  className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 disabled:opacity-50"
                >
                  {acceptingOrder ? 'Acceptation…' : 'Accepter la course'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 
'use client';
import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import DeliveryNotifications from '@/components/DeliveryNotifications';
import DeliveryMap from '@/components/DeliveryMap';
import DeliveryChat from '@/components/DeliveryChat';
import OrderCountdown from '@/components/OrderCountdown';
import PreventiveAlert from '@/components/PreventiveAlert';
import { useRouter } from 'next/navigation';
import { FaCalendarAlt, FaMotorcycle, FaBoxOpen, FaCheckCircle, FaStar, FaDownload, FaChartLine, FaBell, FaComments } from 'react-icons/fa';
import { createClient } from '@supabase/supabase-js';

// Initialiser Supabase côté client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4YnFydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ4NzcsImV4cCI6MjA1MDA1MDg3N30.G7iFlb2vKi1ouABfyI_azLbZ8XGi66tf9kx_dtVIE40'
);
import RealTimeNotifications from '../../components/DeliveryNotifications';

export default function DeliveryDashboard() {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
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

  // Rechargement automatique des commandes pour détecter les nouvelles
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAvailableOrders();
    }, 5000);
    
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
        console.error('❌ Erreur session Supabase:', error);
        return fetch(url, { ...options, credentials: 'include' });
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
        credentials: 'include'
      });
    } catch (error) {
      console.error('❌ Erreur fetchWithAuth:', error);
      return fetch(url, { ...options, credentials: 'include' });
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const response = await fetchWithAuth('/api/delivery/available-orders');
      const data = await response.json();
      
      
      // S'assurer que data est un tableau
      if (Array.isArray(data)) {
        
        // Détecter les nouvelles commandes
        if (data.length > previousOrderCount) {
          const newOrders = data.slice(previousOrderCount);
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
        console.error("❌ Les données ne sont pas un tableau:", data);
        setAvailableOrders([]);
      }
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des commandes disponibles:", error);
      setAvailableOrders([]);
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
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Notification du navigateur
    if (Notification.permission === 'granted') {
      new Notification('Nouvelle commande disponible !', {
        body: `Commande #${order.id} - ${order.customer_name} - ${order.total_amount}€`,
        icon: '/icon-192x192.png',
        tag: 'new-order'
      });
    }

    // Auto-fermer l'alerte après 10 secondes
    setTimeout(() => {
      setShowAlert(false);
      setAlertOrder(null);
    }, 10000);
  };

  const fetchCurrentOrder = async () => {
    try {
      const response = await fetchWithAuth('/api/delivery/current-order');
      if (response.status === 404) {
        setCurrentOrder(null);
        return;
      }
      const data = await response.json();
      
      // Vérifier si une commande existe
      if (data.hasOrder && data.order) {
        setCurrentOrder(data.order);
      } else {
        setCurrentOrder(null);
      }
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération de la commande en cours:", error);
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
      } else {
        console.error('❌ Erreur API alertes préventives:', data);
      }
    } catch (error) {
      console.error("❌ Erreur récupération alertes préventives:", error);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      
      const response = await fetchWithAuth(`/api/delivery/accept-order/${orderId}`, {
        method: 'POST'
      });


      if (response.ok) {
        const result = await response.json();
        alert("Commande acceptée avec succès !");
        fetchAvailableOrders();
        fetchCurrentOrder();
      } else {
        const error = await response.json();
        console.error('❌ Erreur API:', error);
        alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'acceptation de la commande:", error);
      alert(`Erreur: ${error.message || 'Erreur de connexion'}`);
    }
  };

  const completeDelivery = async (orderId) => {
    try {
      
      // Demander le code de sécurité au livreur
      const securityCode = prompt('🔐 Entrez le code de sécurité donné par le client:');
      
      if (!securityCode) {
        alert('Code de sécurité requis pour finaliser la livraison');
        return;
      }
      
      const response = await fetchWithAuth(`/api/delivery/complete-delivery/${orderId}`, {
        method: 'POST',
        body: JSON.stringify({ securityCode })
      });

      if (response.ok) {
        const result = await response.json();
        alert("Livraison finalisée avec succès !");
        setCurrentOrder(null);
        setChatOpen(false); // Fermer le chat après la livraison
        fetchStats();
        fetchAvailableOrders();
        fetchCurrentOrder();
      } else {
        const error = await response.json();
        console.error('❌ Erreur API:', error);
        alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error("❌ Erreur finalisation livraison:", error);
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
        alert(`Erreur: ${error.message}`);
      }
    } catch (error) {
      console.error("Erreur lors du changement de disponibilité:", error);
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
        alert("Erreur lors de l'exportation des gains.");
      }
    } catch (error) {
      console.error("Erreur d'exportation:", error);
    }
  };

  if (!user) {
    return <div>Chargement...</div>;
  }

  return (
    <AuthGuard allowedRoles={['delivery']}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
        <Navbar />
        
        {/* Alerte de nouvelle commande */}
        {showAlert && alertOrder && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white p-4 rounded-lg shadow-lg animate-pulse max-w-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">🔔 Nouvelle commande !</h3>
                <p className="text-sm">Commande #{alertOrder.id}</p>
                <p className="text-sm">{alertOrder.customer_name} - {alertOrder.total_amount}€</p>
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
                  <p className="text-blue-100 text-xs sm:text-sm font-medium">Livraisons Totales</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{stats?.total_deliveries || 0}</p>
                </div>
                <div className="bg-blue-400 bg-opacity-30 p-2 sm:p-3 rounded-full">
                  <FaChartLine className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 text-white transform hover:scale-105 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs sm:text-sm font-medium">Gains Totaux</p>
                  <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{stats?.total_earnings?.toFixed(2) || 0}€</p>
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

          {/* Commande en cours améliorée */}
          {currentOrder && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Commande en cours</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium">
                      #{currentOrder.id}
                    </span>
                    <span className="px-2 sm:px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs sm:text-sm font-medium">
                      {currentOrder.status === 'en_livraison' ? 'En livraison' : 'Prêt à livrer'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">🍽️ Restaurant</h3>
                      <p className="text-gray-700 font-medium">{currentOrder.restaurant_nom}</p>
                      <p className="text-gray-600 text-sm">{currentOrder.restaurant_adresse}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">👤 Client</h3>
                      <p className="text-gray-700 font-medium">{currentOrder.customer_name}</p>
                      <p className="text-gray-600 text-sm">{currentOrder.customer_phone}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">🏠 Adresse de livraison</h3>
                      <p className="text-gray-700">{currentOrder.delivery_address}</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      {(currentOrder.status === 'accepted' || currentOrder.status === 'ready') && (
                        <button
                          onClick={() => completeDelivery(currentOrder.id)}
                          className="flex-1 px-4 sm:px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 transform hover:scale-105 font-semibold min-h-[44px] touch-manipulation text-sm sm:text-base"
                        >
                          ✅ Marquer comme livrée
                        </button>
                      )}
                      <button
                        onClick={() => setChatOpen(true)}
                        className="px-4 sm:px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 font-semibold min-h-[44px] touch-manipulation text-sm sm:text-base"
                      >
                        <FaComments className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                        Chat
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <DeliveryMap
                      currentOrder={currentOrder}
                      deliveryLocation={{
                        lat: 43.9333,
                        lng: 3.7167,
                        address: 'Position du livreur'
                      }}
                    />
                  </div>
                </div>
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
                          <strong>Client:</strong> {alert.customer_name}
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
                                {order.delivery_fee || 'N/A'}€
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
                                <p className="text-gray-700 font-medium text-sm">{order.customer_name || 'N/A'}</p>
                                <p className="text-gray-600 text-xs">{order.delivery_address || 'N/A'}</p>
                              </div>
                            </div>
                            
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                              <span>Total: {order.total_amount || order.total || 'N/A'}€</span>
                              <span>Frais: {order.delivery_fee || 'N/A'}€</span>
                              <span>Est. {order.estimated_time || 'N/A'} min</span>
                            </div>
                          
                          {/* Décompte en temps réel */}
                          {order.status === 'preparing' && order.preparation_time && (
                            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-orange-800">⏰ Temps de préparation</h4>
                                  <p className="text-sm text-orange-600">
                                    Commande en préparation - {order.preparation_time} min estimées
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
                          {(order.status === 'ready' || order.status === 'preparing') ? (
                            // Commande prête ou en préparation, livreur peut accepter
                            <button
                              onClick={() => acceptOrder(order.id)}
                              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 transform hover:scale-105 font-semibold shadow-lg text-sm min-h-[44px] touch-manipulation"
                            >
                              ✅ Accepter
                            </button>
                          ) : order.status === 'accepted' && order.delivery_id === user?.id ? (
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
                          ) : order.status === 'accepted' && order.delivery_id !== user?.id ? (
                            // Commande acceptée par un autre livreur - AUCUNE action possible
                            <span className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-xs text-center">
                              👤 Autre livreur
                            </span>
                          ) : order.status === 'delivered' ? (
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
            customerName={currentOrder.customer_name}
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>
    </AuthGuard>
  );
} 
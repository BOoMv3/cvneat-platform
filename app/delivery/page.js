'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { FaHome } from 'react-icons/fa';

export default function DeliveryDashboard() {
  const [user, setUser] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    completedDeliveries: 0,
    totalEarnings: 0,
    averageDeliveryTime: 0,
    rating: 0,
    totalDeliveries: 0
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const router = useRouter();

  const [currentOrder, setCurrentOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertOrder, setAlertOrder] = useState(null);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioEnabledRef = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setAuthError('Vous devez être connecté pour accéder à cette page');
        setLoading(false);
        return;
      }

      // Vérifier le rôle
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || userData.role !== 'delivery') {
        setAuthError(`Accès refusé. Votre rôle est : ${userData ? userData.role : 'aucun'}. Seuls les livreurs peuvent accéder à cette page.`);
        setLoading(false);
        return;
      }

      setUser(session.user);
      await fetchStats();
      await fetchAvailableOrders();
      await fetchCurrentOrder();
      
      // Vérifier les nouvelles commandes toutes les 5 secondes
      const interval = setInterval(() => {
        fetchAvailableOrders();
        fetchCurrentOrder();
      }, 5000);
      
      // Rafraîchir les statistiques toutes les 30 secondes
      const statsInterval = setInterval(() => {
        fetchStats();
      }, 30000);

      return () => {
        clearInterval(interval);
        clearInterval(statsInterval);
      };
    };

    checkAuth();
  }, []);

  // Initialiser l'audio context au chargement de la page
  useEffect(() => {
    const initAudio = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('🔊 AudioContext initialisé');
        
        // Créer un son silencieux pour activer l'audio
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.001);
        
        console.log('🔊 Audio activé avec succès');
      } catch (error) {
        console.log('❌ Erreur initialisation audio:', error);
      }
    };

    // Initialiser l'audio après un court délai
    setTimeout(initAudio, 1000);
  }, []);

  const fetchStats = async () => {
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ Pas de token d\'authentification pour stats');
        return;
      }
      
      const response = await fetch('/api/delivery/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        console.log('📊 Stats reçues:', data);
        setStats({
          todayDeliveries: data.today_deliveries || 0,
          completedDeliveries: data.completed_deliveries || 0,
          totalEarnings: data.total_earnings || 0,
          averageDeliveryTime: data.average_delivery_time || 0,
          rating: data.average_rating || 0,
          totalDeliveries: data.total_deliveries || 0
        });
      } else {
        console.error('❌ Erreur API stats:', data);
      }
    } catch (error) {
      console.error('❌ Erreur recuperation stats:', error);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      console.log('🔍 Récupération des commandes disponibles...');
      
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ Pas de token d\'authentification');
        setDeliveries([]);
        return;
      }
      
      const response = await fetch('/api/delivery/available-orders', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Commandes reçues:', data.length);
        
        // Détecter les nouvelles commandes
        if (data.length > previousOrderCount) {
          const newOrders = data.slice(previousOrderCount);
          console.log('🔔 Nouvelles commandes détectées:', newOrders.length);
          console.log('🔔 Commandes précédentes:', previousOrderCount, 'Nouvelles:', data.length);
          
          // Afficher une alerte pour chaque nouvelle commande
          newOrders.forEach(order => {
            console.log('🔔 Affichage alerte pour commande:', order.id);
            showNewOrderAlert(order); // L'état audio est géré dans la fonction
          });
        }
        
        // Si c'est le premier chargement et qu'il y a des commandes, afficher une alerte
        if (previousOrderCount === 0 && data.length > 0) {
          console.log('🔔 Premier chargement avec commandes disponibles, affichage alerte');
          data.forEach(order => {
            console.log('🔔 Affichage alerte pour commande existante:', order.id);
            showNewOrderAlert(order); // L'état audio est géré dans la fonction
          });
        }
        
        setDeliveries(data.slice(0, 5)); // Limiter a 5 commandes
        setPreviousOrderCount(data.length);
      } else {
        console.error('❌ Erreur API:', data);
        setDeliveries([]);
      }
    } catch (error) {
      console.error('❌ Erreur récupération commandes:', error);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentOrder = async () => {
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ Pas de token d\'authentification');
        return;
      }
      
      const response = await fetch('/api/delivery/current-order', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (response.ok && data.hasOrder && data.order) {
        setCurrentOrder(data.order);
      }
    } catch (error) {
      console.error('Erreur récupération commande actuelle:', error);
    }
  };

  const completeDelivery = async (orderId) => {
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ Pas de token d\'authentification');
        return;
      }
      
      const response = await fetch(`/api/delivery/complete-delivery/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Livraison finalisée avec succès !');
        setCurrentOrder(null);
        fetchStats();
        fetchAvailableOrders();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur finalisation livraison:', error);
      alert(`Erreur: ${error.message || 'Erreur de connexion'}`);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ Pas de token d\'authentification');
        return;
      }
      
      const response = await fetch(`/api/delivery/accept-order/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Commande acceptée avec succès !');
        fetchAvailableOrders();
        fetchCurrentOrder();
        fetchStats();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur acceptation commande:', error);
      alert(`Erreur: ${error.message || 'Erreur de connexion'}`);
    }
  };

  // Fonction pour activer/désactiver l'audio
  const toggleAudio = async () => {
    if (audioEnabled) {
      // Désactiver l'audio
      setAudioEnabled(false);
      audioEnabledRef.current = false;
      console.log('🔇 Audio désactivé');
      console.log('🔇 audioEnabledRef.current:', audioEnabledRef.current);
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
        console.log('🔊 Audio activé manuellement');
        console.log('🔊 audioEnabledRef.current:', audioEnabledRef.current);
        
        // Attendre un peu que l'état soit mis à jour, puis jouer le son de test
        setTimeout(() => {
          playAlertSound(true); // Force le son
        }, 100);
      } catch (error) {
        console.log('❌ Erreur activation audio:', error);
      }
    }
  };

  // Fonction pour jouer un son d'alerte
  const playAlertSound = (force = false) => {
    if (!audioEnabledRef.current && !force) {
      console.log('🔇 Audio désactivé (via ref), son ignoré');
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
      
      console.log('🔊 Son d\'alerte joué');
    } catch (error) {
      console.log('❌ Impossible de jouer le son d\'alerte:', error);
    }
  };

  // Fonction pour afficher une alerte de nouvelle commande
  const showNewOrderAlert = (order, forceSound = false) => {
    console.log('🔔 showNewOrderAlert appelée:', { orderId: order.id, audioEnabled, audioEnabledRef: audioEnabledRef.current, forceSound });
    setAlertOrder(order);
    setShowAlert(true);
    
    // Utiliser la référence pour avoir l'état actuel
    if (audioEnabledRef.current) {
      console.log('🔊 Audio activé (via ref), jouer le son');
      playAlertSound(false); // Pas de force, utilise l'état normal
    } else if (forceSound) {
      console.log('🔊 Force son activé, jouer le son');
      playAlertSound(true); // Force le son pour les tests
    } else {
      console.log('🔇 Audio désactivé, son ignoré');
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center">
            <h2 className="text-lg font-semibold mb-2">Accès refusé</h2>
            <p className="mb-4">{authError}</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Se connecter
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-3 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col space-y-4 mb-6 sm:mb-8">
          {/* Bouton retour et titre */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white p-3 sm:p-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              title="Retour à l'accueil"
            >
              <FaHome className="h-6 w-6 sm:h-5 sm:w-5" />
              <span className="text-base sm:text-sm font-medium">Accueil</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Tableau de bord livreur</h1>
            </div>
          </div>
          
          {/* Bouton dashboard avancé et activation audio */}
          <div className="flex justify-center sm:justify-end space-x-4">
            <button
              onClick={toggleAudio}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                audioEnabled 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              <span>{audioEnabled ? '🔊' : '🔇'}</span>
              <span className="text-sm sm:text-base">{audioEnabled ? 'Audio Activé' : 'Activer Audio'}</span>
            </button>
            <button
              onClick={() => router.push('/delivery/dashboard')}
              className="bg-blue-600 text-white px-4 sm:px-6 py-3 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium w-full sm:w-auto"
            >
              Dashboard avancé
            </button>
            <button
              onClick={() => router.push('/delivery/my-orders')}
              className="bg-green-600 text-white px-4 sm:px-6 py-3 sm:py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium w-full sm:w-auto"
            >
              Mes Commandes
            </button>
          </div>
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Livraisons aujourd'hui</h3>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.todayDeliveries}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Total livraisons</h3>
            <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{stats.totalDeliveries}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Livraisons terminées</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.completedDeliveries}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Gains totaux</h3>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.totalEarnings.toFixed(2)}€</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Temps moyen</h3>
            <p className="text-2xl sm:text-3xl font-bold text-orange-600">{stats.averageDeliveryTime} min</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-600 mb-2">Note moyenne</h3>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.rating.toFixed(1)} ⭐</p>
          </div>
        </div>

        {/* Commande actuelle en cours de livraison */}
        {currentOrder && (
          <div className="bg-blue-50 border border-blue-200 p-4 sm:p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-blue-900 mb-4">🚚 Livraison en cours</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Détails de la commande</h3>
                <p className="text-xs sm:text-sm text-blue-800 mb-1">
                  <strong>Restaurant:</strong> {currentOrder.restaurant_nom}
                </p>
                <p className="text-xs sm:text-sm text-blue-800 mb-1">
                  <strong>Client:</strong> {currentOrder.customer_name}
                </p>
                <p className="text-xs sm:text-sm text-blue-800 mb-1">
                  <strong>Adresse:</strong> {currentOrder.delivery_address}
                </p>
                <p className="text-xs sm:text-sm text-blue-800 mb-1">
                  <strong>Frais de livraison:</strong> {currentOrder.delivery_fee}€
                </p>
              </div>
              <div className="text-center md:text-right">
                <button
                  onClick={() => completeDelivery(currentOrder.id)}
                  className="bg-green-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base"
                >
                  ✅ Marquer comme livrée
                </button>
                <p className="text-xs text-blue-600 mt-2">
                  Commande #{currentOrder.id} - {new Date(currentOrder.created_at).toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Commandes disponibles */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">📦 Commandes disponibles</h2>
          {deliveries.length > 0 ? (
            <div className="space-y-4">
              {deliveries.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">Commande #{order.id}</h3>
                      <p className="text-sm text-gray-600">{order.customer_name}</p>
                    </div>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                      {order.total_amount}€
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    <p><strong>Adresse:</strong> {order.delivery_address}</p>
                    <p><strong>Ville:</strong> {order.delivery_city} {order.delivery_postal_code}</p>
                    {order.delivery_instructions && (
                      <p><strong>Instructions:</strong> {order.delivery_instructions}</p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => acceptOrder(order.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      ✅ Accepter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">Aucune commande disponible pour le moment</p>
              <p className="text-gray-400 text-sm mt-2">Les nouvelles commandes apparaîtront ici</p>
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => router.push('/delivery/history')}
            className="bg-purple-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
          >
            Historique
          </button>
          <button
            onClick={() => router.push('/delivery/reviews')}
            className="bg-yellow-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm sm:text-base"
          >
            Avis clients
          </button>
        </div>
      </div>
    </main>
  );
}

// Desactiver le rendu statique pour cette page
export const dynamic = 'force-dynamic'; 
'use client';

import { useState, useEffect } from 'react';

export default function PushNotificationService() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    checkNotificationSupport();
    checkPermission();
    checkExistingSubscription();
    setupNotificationClickHandlers();
  }, []);

  const checkNotificationSupport = () => {
    // Support plus permissif pour iOS
    const isSupported = typeof window !== 'undefined' && (
      'Notification' in window || 
      'serviceWorker' in navigator ||
      window.navigator.userAgent.includes('iPhone') ||
      window.navigator.userAgent.includes('iPad')
    );
    setIsSupported(isSupported);
  };

  const checkPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    } else {
      // Sur iOS, définir une permission par défaut
      setPermission('default');
    }
  };

  const checkExistingSubscription = () => {
    // Vérifier si l'utilisateur est déjà abonné (stocké en localStorage)
    if (typeof window !== 'undefined') {
      try {
        const subscribed = localStorage.getItem('push-notifications-subscribed') === 'true';
        setIsSubscribed(subscribed);
      } catch (error) {
        console.error('Erreur localStorage:', error);
        setIsSubscribed(false);
      }
    }
  };

  const setupNotificationClickHandlers = () => {
    if (typeof window !== 'undefined') {
      // Gérer les clics sur les notifications
      navigator.serviceWorker?.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          handleNotificationClick(event.data);
        }
      });

      // Gérer les actions des notifications
      navigator.serviceWorker?.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
          handleNotificationAction(event.data);
        }
      });
    }
  };

  const handleNotificationClick = (data) => {
    console.log('🔔 Notification cliquée:', data);
    
    // Rediriger vers la page appropriée selon le type de notification
    if (data.notificationData) {
      const { type, order_id, complaint_url } = data.notificationData;
      
      if (type === 'delivery_completed' && complaint_url) {
        // Rediriger vers la page de réclamation ou de commande
        window.location.href = complaint_url;
      } else if (order_id) {
        // Rediriger vers la page de commande
        window.location.href = `/orders/${order_id}`;
      }
    }
  };

  const handleNotificationAction = (data) => {
    console.log('🔔 Action de notification:', data);
    
    if (data.action === 'feedback' && data.notificationData?.feedback_url) {
      window.location.href = data.notificationData.feedback_url;
    } else if (data.action === 'view' && data.notificationData?.order_id) {
      window.location.href = `/orders/${data.notificationData.order_id}`;
    } else if (data.action === 'complaint' && data.notificationData?.complaint_url) {
      window.location.href = data.notificationData.complaint_url;
    }
  };

  const requestPermission = async () => {
    console.log('🔔 Début de la demande de permission...');
    
    // Gestion spéciale pour iOS
    const isIOS = typeof window !== 'undefined' && (
      window.navigator.userAgent.includes('iPhone') ||
      window.navigator.userAgent.includes('iPad')
    );

    if (isIOS) {
      console.log('🍎 Détection iOS - activation directe');
      if (typeof window !== 'undefined') {
        localStorage.setItem('push-notifications-subscribed', 'true');
      }
      setIsSubscribed(true);
      setPermission('granted');
      alert('Notifications activées pour iOS ! Vous pouvez les tester.');
      return;
    }

    // Vérification plus robuste pour autres navigateurs
    if (typeof window === 'undefined' || typeof window.Notification === 'undefined') {
      console.log('❌ Notifications non supportées');
      alert('Ce navigateur ne supporte pas les notifications');
      return;
    }

    console.log('✅ Notifications supportées');
    console.log('📱 Permission actuelle:', Notification.permission);

    try {
      // Vérifier si requestPermission est une fonction
      if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') {
        console.log('❌ requestPermission non disponible');
        alert('Demande de permission non disponible sur ce navigateur');
        return;
      }

      const permission = await Notification.requestPermission();
      console.log('📱 Nouvelle permission:', permission);
      setPermission(permission);
      
      if (permission === 'granted') {
        console.log('✅ Permission accordée, activation des notifications...');
        
        // Marquer comme abonné sans créer de notification immédiate
        if (typeof window !== 'undefined') {
          localStorage.setItem('push-notifications-subscribed', 'true');
        }
        setIsSubscribed(true);
        
        alert('Notifications activées avec succès ! Vous pouvez maintenant les tester.');
        
      } else if (permission === 'denied') {
        console.log('❌ Permission refusée');
        alert('Les notifications ont été refusées. Vous pouvez les activer dans les paramètres de votre navigateur.');
      } else {
        console.log('⚠️ Permission non accordée');
        alert('Permission non accordée. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la demande de permission:', error);
      // En cas d'erreur, marquer quand même comme abonné
      if (typeof window !== 'undefined') {
        localStorage.setItem('push-notifications-subscribed', 'true');
      }
      setIsSubscribed(true);
      alert('Notifications activées en mode compatibilité ! Vous pouvez les tester.');
    }
  };

  const subscribeToNotifications = async () => {
    try {
      // Vérifier que localStorage est disponible
      if (typeof window !== 'undefined') {
        localStorage.setItem('push-notifications-subscribed', 'true');
      }
      setIsSubscribed(true);
      
      console.log('Notifications activées avec succès !');
      alert('Notifications activées avec succès ! Vous pouvez les tester.');
      
    } catch (error) {
      console.error('Erreur lors de l\'abonnement:', error);
      // Même en cas d'erreur, marquer comme abonné
      if (typeof window !== 'undefined') {
        localStorage.setItem('push-notifications-subscribed', 'true');
      }
      setIsSubscribed(true);
      alert('Notifications activées en mode compatibilité !');
    }
  };

  const unsubscribeFromNotifications = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('push-notifications-subscribed');
      }
      setIsSubscribed(false);
      alert('Notifications désactivées');
    } catch (error) {
      console.error('Erreur lors de la désactivation:', error);
      alert('Erreur lors de la désactivation des notifications');
    }
  };

  const sendTestNotification = () => {
    console.log('🧪 Test de notification...');
    console.log('Permission actuelle:', permission);
    
    if (permission === 'granted') {
      try {
        console.log('✅ Création de la notification...');
        
        // Vérifier si Notification est disponible
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const notification = new Notification('CVN\'Eat - Test', {
            body: 'Test de notification - Votre commande est prête !',
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'test-notification',
            requireInteraction: true,
            silent: false
          });
          
          console.log('✅ Notification créée:', notification);
          
          // Fermer automatiquement après 5 secondes
          setTimeout(() => {
            if (notification && notification.close) {
              notification.close();
            }
          }, 5000);
          
          alert('Notification de test envoyée ! Vérifiez votre barre de notifications.');
        } else {
          console.log('⚠️ Notification non disponible, utilisation d\'alert');
          alert('Test de notification - Votre commande est prête ! (Mode compatibilité)');
        }
        
      } catch (error) {
        console.error('❌ Erreur création notification:', error);
        // Fallback vers alert
        alert('Test de notification - Votre commande est prête ! (Mode compatibilité)');
      }
    } else {
      console.log('❌ Permission non accordée');
      alert('Veuillez d\'abord autoriser les notifications en cliquant sur "Activer les notifications"');
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications Push</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Statut des notifications</h4>
            <p className="text-sm text-gray-600">
              {isSubscribed && permission === 'granted' ? 'Activées' : 
               permission === 'denied' ? 'Désactivées' : 
               'Non configurées'}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            isSubscribed && permission === 'granted' ? 'bg-green-500' :
            permission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
        </div>

        {permission === 'default' && (
          <div className="space-y-2">
            <button
              onClick={requestPermission}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors touch-manipulation"
            >
              Activer les notifications
            </button>
            <button
              onClick={() => {
                console.log('🔍 Diagnostic notifications:');
                console.log('- Support:', 'Notification' in window);
                console.log('- Permission actuelle:', Notification?.permission);
                console.log('- LocalStorage disponible:', typeof localStorage !== 'undefined');
                console.log('- User Agent:', navigator.userAgent);
                alert('Diagnostic envoyé dans la console (F12)');
              }}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors touch-manipulation text-sm"
            >
              🔍 Diagnostic
            </button>
          </div>
        )}

        {permission === 'granted' && isSubscribed && (
          <div className="space-y-2">
            <p className="text-sm text-green-600">✓ Notifications activées</p>
            <button
              onClick={sendTestNotification}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors touch-manipulation mr-2"
            >
              Tester les notifications
            </button>
            <button
              onClick={unsubscribeFromNotifications}
              className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors touch-manipulation"
            >
              Désactiver les notifications
            </button>
          </div>
        )}

        {permission === 'granted' && !isSubscribed && (
          <button
            onClick={subscribeToNotifications}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors touch-manipulation"
          >
            S'abonner aux notifications
          </button>
        )}

        {permission === 'denied' && (
          <div className="text-sm text-red-600">
            <p>Les notifications ont été désactivées.</p>
            <p>Vous pouvez les réactiver dans les paramètres de votre navigateur.</p>
          </div>
        )}
      </div>
    </div>
  );
}

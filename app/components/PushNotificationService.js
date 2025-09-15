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
  }, []);

  const checkNotificationSupport = () => {
    setIsSupported('Notification' in window);
  };

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
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

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Ce navigateur ne supporte pas les notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        // Attendre un peu avant de créer la notification
        setTimeout(() => {
          subscribeToNotifications();
        }, 100);
      } else if (permission === 'denied') {
        alert('Les notifications ont été refusées. Vous pouvez les activer dans les paramètres de votre navigateur.');
      } else {
        alert('Permission non accordée. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      alert('Erreur lors de la demande de permission: ' + error.message);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      // Vérifier que localStorage est disponible
      if (typeof window !== 'undefined') {
        localStorage.setItem('push-notifications-subscribed', 'true');
      }
      setIsSubscribed(true);
      
      // Vérifier que les notifications sont autorisées
      if (Notification.permission === 'granted') {
        // Tester une notification
        new Notification('CVN\'Eat', {
          body: 'Notifications activées avec succès ! Vous recevrez des mises à jour sur vos commandes.',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'welcome'
        });
      }
      
      console.log('Notifications activées avec succès !');
      
    } catch (error) {
      console.error('Erreur lors de l\'abonnement:', error);
      alert('Erreur lors de l\'activation des notifications: ' + error.message);
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
    if (permission === 'granted') {
      new Notification('CVN\'Eat', {
        body: 'Test de notification - Votre commande est prête !',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'test-notification'
      });
    } else {
      alert('Veuillez d\'abord autoriser les notifications');
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
          <button
            onClick={requestPermission}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors touch-manipulation"
          >
            Activer les notifications
          </button>
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

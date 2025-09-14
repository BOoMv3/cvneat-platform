'use client';

import { useState, useEffect } from 'react';

export default function PushNotificationService() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    checkNotificationSupport();
    checkPermission();
  }, []);

  const checkNotificationSupport = () => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
  };

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Ce navigateur ne supporte pas les notifications');
      return;
    }

    const permission = await Notification.requestPermission();
    setPermission(permission);
    
    if (permission === 'granted') {
      await subscribeToNotifications();
    }
  };

  const subscribeToNotifications = async () => {
    try {
      // Enregistrer le service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Obtenir l'abonnement
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      setSubscription(subscription);

      // Envoyer l'abonnement au serveur
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

    } catch (error) {
      console.error('Erreur lors de l\'abonnement:', error);
    }
  };

  const sendTestNotification = () => {
    if (permission === 'granted') {
      new Notification('CVNeat', {
        body: 'Test de notification - Votre commande est prête !',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'test-notification'
      });
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
              {permission === 'granted' ? 'Activées' : 
               permission === 'denied' ? 'Désactivées' : 
               'Non configurées'}
            </p>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            permission === 'granted' ? 'bg-green-500' :
            permission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
        </div>

        {permission === 'default' && (
          <button
            onClick={requestPermission}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Activer les notifications
          </button>
        )}

        {permission === 'granted' && (
          <div className="space-y-2">
            <p className="text-sm text-green-600">✓ Notifications activées</p>
            <button
              onClick={sendTestNotification}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
            >
              Tester les notifications
            </button>
          </div>
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

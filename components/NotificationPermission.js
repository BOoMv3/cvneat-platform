'use client';

import { useState, useEffect } from 'react';

export default function NotificationPermission() {
  const [showBanner, setShowBanner] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    // Vérifier si les notifications sont supportées
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Afficher la bannière si la permission n'est pas accordée
      if (Notification.permission === 'default') {
        setShowBanner(true);
      }
    }
  }, []);

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowBanner(false);
      
      if (result === 'granted') {
        // Enregistrer le service worker pour les notifications push
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          
          // Demander l'abonnement aux notifications push
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          });
          
          // Envoyer l'abonnement au serveur
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription: subscription.toJSON()
            })
          });
        }
      }
    } catch (error) {
      console.error('Erreur demande permission notifications:', error);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    // Sauvegarder dans localStorage pour ne plus afficher
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  // Ne pas afficher si déjà fermé ou si permission accordée
  if (!showBanner || permission === 'granted' || permission === 'denied') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Activer les notifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Recevez des notifications pour vos commandes et offres spéciales
            </p>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={requestPermission}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-md transition-colors"
              >
                Activer
              </button>
              <button
                onClick={dismissBanner}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xs px-3 py-1.5 rounded-md transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>
          
          <button
            onClick={dismissBanner}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 
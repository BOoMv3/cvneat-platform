'use client';

import { useState, useEffect } from 'react';

export default function NotificationPermission({ orderId }) {
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Vérifier si les notifications sont supportées
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Enregistrer l'ID de commande pour les notifications
        localStorage.setItem('notificationOrderId', orderId);
        
        // Envoyer une notification de test
        new Notification('CVN\'Eat', {
          body: 'Vous recevrez des notifications pour le suivi de votre commande !',
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
    }
  };

  const sendTestNotification = () => {
    if (permission === 'granted') {
      new Notification('CVN\'Eat - Test', {
        body: 'Ceci est une notification de test pour votre commande #' + orderId,
        icon: '/favicon.ico',
        tag: 'order-' + orderId
      });
    }
  };

  if (!isSupported) {
    return null;
  }

  if (permission === 'granted') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Notifications activées
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Vous recevrez des notifications pour les mises à jour de votre commande.</p>
            </div>
            <div className="mt-4">
              <button
                onClick={sendTestNotification}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm hover:bg-green-200 transition-colors"
              >
                Tester la notification
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Notifications désactivées
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Pour recevoir des notifications, veuillez autoriser les notifications dans les paramètres de votre navigateur.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-800">
            Recevoir des notifications
          </h3>
          <div className="mt-2 text-sm text-blue-700">
            <p>Activez les notifications pour être informé en temps réel du statut de votre commande.</p>
          </div>
          <div className="mt-4">
            <button
              onClick={requestPermission}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              Activer les notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

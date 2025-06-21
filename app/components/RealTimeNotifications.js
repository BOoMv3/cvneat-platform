'use client';
import { useState, useEffect } from 'react';
import { FaBell, FaTimes, FaShoppingCart, FaEuroSign, FaExclamationCircle } from 'react-icons/fa';

export default function RealTimeNotifications({ restaurantId }) {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;

    // Connexion SSE pour les notifications en temps réel
    const eventSource = new EventSource(`/api/partner/notifications/sse?restaurantId=${restaurantId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('Connecté aux notifications en temps réel');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_order') {
          // Ajouter la notification avec un effet visuel
          const newNotification = {
            id: Date.now(),
            type: 'new_order',
            message: data.message,
            data: data.order,
            timestamp: data.timestamp,
            isNew: true
          };
          
          setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
          
          // Supprimer l'effet "nouveau" après 5 secondes
          setTimeout(() => {
            setNotifications(prev => 
              prev.map(n => n.id === newNotification.id ? { ...n, isNew: false } : n)
            );
          }, 5000);
        }
      } catch (error) {
        console.error('Erreur parsing notification SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Erreur SSE:', error);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [restaurantId]);

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
    <div className="relative">
      {/* Bouton notifications */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <FaBell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
        {isConnected && (
          <span className="absolute -bottom-1 -right-1 bg-green-500 rounded-full h-2 w-2"></span>
        )}
      </button>

      {/* Panneau notifications */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center mt-2">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span className="text-xs text-gray-500">
                {isConnected ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <FaBell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y">
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
                          <p className="text-sm font-medium text-gray-900">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.timestamp).toLocaleTimeString('fr-FR')}
                          </p>
                          {notification.data && (
                            <div className="mt-2 text-xs text-gray-600">
                              <p>Commande #{notification.data.id}</p>
                              <p>{notification.data.total}€</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600 ml-2"
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
            <div className="p-3 border-t bg-gray-50">
              <button
                onClick={() => setNotifications([])}
                className="w-full text-sm text-gray-600 hover:text-gray-800"
              >
                Effacer toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
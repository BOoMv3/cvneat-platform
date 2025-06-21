'use client';
import { useState, useEffect } from 'react';
import { FaBell, FaTimes, FaTruck, FaCheckCircle } from 'react-icons/fa';

export default function DeliveryNotifications({ deliveryId }) {
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!deliveryId) return;
    const eventSource = new EventSource(`/api/delivery/notifications/sse?deliveryId=${deliveryId}`);

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setNotifications(prev => [
          { ...data, id: Date.now() + Math.random() },
          ...prev.slice(0, 9)
        ]);
      } catch (e) {
        // ignore
      }
    };
    return () => eventSource.close();
  }, [deliveryId]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
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
      {showPanel && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b flex items-center justify-between">
            <span className="font-semibold text-gray-900">Notifications</span>
            <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600">
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <FaBell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`p-4 border-b flex items-start space-x-3 ${notif.type === 'new_order' ? 'bg-blue-50' : 'bg-green-50'}`}>
                  <div className="mt-1">
                    {notif.type === 'new_order' ? <FaTruck className="text-blue-600 h-5 w-5" /> : <FaCheckCircle className="text-green-600 h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(notif.timestamp).toLocaleTimeString('fr-FR')}</p>
                  </div>
                  <button onClick={() => removeNotification(notif.id)} className="text-gray-400 hover:text-gray-600 ml-2">
                    <FaTimes className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <button onClick={() => setNotifications([])} className="w-full text-sm text-gray-600 hover:text-gray-800">
                Effacer toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
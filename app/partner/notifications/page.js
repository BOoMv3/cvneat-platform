'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  FaBell, 
  FaCheck, 
  FaTimes, 
  FaTrash,
  FaShoppingCart,
  FaEuroSign,
  FaInfoCircle,
  FaExclamationCircle
} from 'react-icons/fa';

export default function PartnerNotifications() {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Vérifier le rôle
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || userData.role !== 'restaurant') {
        router.push('/');
        return;
      }

      setUser(session.user);

      // Récupérer le restaurant
      const { data: resto, error: restoError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (restoError || !resto) {
        router.push('/profil-partenaire');
        return;
      }

      setRestaurant(resto);
      await fetchNotifications(resto.id);
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const fetchNotifications = async (restaurantId) => {
    try {
      const response = await fetch(`/api/partner/notifications?restaurantId=${restaurantId}`);
      const data = await response.json();
      if (response.ok) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch('/api/partner/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId, lu: true })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, lu: true } : notif
          )
        );
      }
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/partner/notifications?id=${notificationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      }
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/partner/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id })
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, lu: true })));
      }
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_order':
        return <FaShoppingCart className="h-5 w-5 text-blue-600" />;
      case 'revenue':
        return <FaEuroSign className="h-5 w-5 text-green-600" />;
      case 'alert':
        return <FaExclamationCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FaInfoCircle className="h-5 w-5 text-gray-600" />;
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

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.lu;
    if (filter === 'read') return notification.lu;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.lu).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600">{restaurant?.nom}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/partner')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contrôles */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Filtrer :</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes ({notifications.length})</option>
                <option value="unread">Non lues ({unreadCount})</option>
                <option value="read">Lues ({notifications.length - unreadCount})</option>
              </select>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <FaCheck className="h-4 w-4" />
                <span>Tout marquer comme lu</span>
              </button>
            )}
          </div>
        </div>

        {/* Liste des notifications */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <FaBell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' ? 'Aucune notification' : 
                 filter === 'unread' ? 'Aucune notification non lue' : 
                 'Aucune notification lue'}
              </h3>
              <p className="text-gray-600">
                {filter === 'all' ? 'Vous n\'avez pas encore reçu de notifications.' :
                 filter === 'unread' ? 'Toutes vos notifications ont été lues.' :
                 'Vous n\'avez pas encore lu de notifications.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm border p-6 ${getNotificationColor(notification.type)} ${
                  !notification.lu ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-sm font-medium ${
                          !notification.lu ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.message}
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      
                      {notification.data && Object.keys(notification.data).length > 0 && (
                        <div className="mt-2 p-3 bg-white rounded border">
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(notification.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {!notification.lu && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Marquer comme lu"
                      >
                        <FaCheck className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Supprimer"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 
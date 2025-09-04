'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function DeliveryOrderAlert() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Vérifier l'authentification
    checkAuth();
    
    // Écouter les nouvelles commandes
    const channel = supabase
      .channel('delivery-orders')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders',
          filter: 'status=in.(pending,ready)'
        }, 
        (payload) => {
          console.log('Nouvelle commande disponible:', payload.new);
          fetchAvailableOrders();
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: 'status=in.(pending,ready)'
        }, 
        (payload) => {
          console.log('Commande mise à jour:', payload.new);
          fetchAvailableOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchAvailableOrders();
      }
    } catch (error) {
      console.error('Erreur authentification:', error);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      console.log('🔍 Récupération des commandes disponibles...');
      
      // Utiliser l'API au lieu de Supabase directement
      const response = await fetch('/api/delivery/available-orders');
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Commandes reçues de l\'API:', data.length);
      setOrders(data || []);
    } catch (error) {
      console.error('❌ Erreur récupération commandes:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'in_delivery',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Retirer la commande de la liste
      setOrders(prev => prev.filter(order => order.id !== orderId));
      
      // Notifier le restaurant
      await notifyRestaurant(orderId);
      
      alert('Commande acceptée avec succès !');
      
    } catch (error) {
      console.error('Erreur acceptation commande:', error);
      alert('Erreur lors de l\'acceptation de la commande');
    }
  };

  const notifyRestaurant = async (orderId) => {
    try {
      // Mettre à jour le statut pour notifier le restaurant
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'in_delivery',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur notification restaurant:', error);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Calcul simple de distance (approximatif)
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600">Veuillez vous connecter pour voir les commandes disponibles</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">Aucune commande disponible pour le moment</p>
        <p className="text-sm text-gray-500 mt-2">Les nouvelles commandes apparaîtront ici automatiquement</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        🚚 Commandes Disponibles ({orders.length})
      </h2>
      
      {orders.map((order) => (
        <div key={order.id} className="bg-white border-2 border-blue-300 rounded-lg p-6 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Commande #{order.id}
              </h3>
              <p className="text-sm text-gray-600">
                {new Date(order.created_at).toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">
                {order.total_amount + order.delivery_fee}€
              </p>
              <p className="text-sm text-gray-500">
                Gain: {order.delivery_fee}€
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Restaurant:</h4>
            <p className="text-gray-600">
              {order.restaurant?.nom || 'Restaurant inconnu'}
            </p>
            <p className="text-gray-600">
              {order.restaurant?.adresse || 'Adresse non disponible'}
            </p>
            <p className="text-gray-600">
              {order.restaurant?.telephone || 'Téléphone non disponible'}
            </p>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Livraison:</h4>
            <p className="text-gray-600">
              {order.customer_name} - {order.customer_phone}
            </p>
            <p className="text-gray-600">
              {order.delivery_address}, {order.delivery_city} {order.delivery_postal_code}
            </p>
            {order.delivery_instructions && (
              <p className="text-gray-600 italic">
                Instructions: {order.delivery_instructions}
              </p>
            )}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Articles:</h4>
            <div className="space-y-1">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{item.price}€</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => handleAcceptOrder(order.id)}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              ✅ Accepter la Course
            </button>
            <button
              onClick={() => window.open(`https://maps.google.com/maps?q=${order.delivery_address}`, '_blank')}
              className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              🗺️ Voir sur Maps
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

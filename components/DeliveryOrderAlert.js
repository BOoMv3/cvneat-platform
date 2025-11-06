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
    
    // Écouter les nouvelles commandes dès qu'elles sont en préparation (acceptées par le restaurant)
    // Pas besoin d'attendre ready_for_delivery=true, les livreurs peuvent se préparer avant
    const channel = supabase
      .channel('delivery-orders')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'commandes',
          filter: 'statut=eq.en_preparation'
        }, 
        (payload) => {
          // Vérifier que livreur_id est null (pas encore assignée)
          if (!payload.new.livreur_id) {
            console.log('Nouvelle commande disponible (en préparation):', payload.new);
            fetchAvailableOrders();
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'commandes',
          filter: 'statut=eq.en_preparation'
        }, 
        (payload) => {
          // Vérifier que livreur_id est null (pas encore assignée)
          if (!payload.new.livreur_id) {
            console.log('Commande disponible mise à jour (en préparation):', payload.new);
            fetchAvailableOrders();
          }
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
      // Utiliser l'API pour accepter la commande
      const response = await fetch(`/api/delivery/accept-order/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'acceptation');
      }
      
      // Retirer la commande de la liste
      setOrders(prev => prev.filter(order => order.id !== orderId));
      
      alert('Commande acceptée avec succès !');
      
    } catch (error) {
      console.error('Erreur acceptation commande:', error);
      alert(error.message || 'Erreur lors de l\'acceptation de la commande');
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
              {(() => {
                const totalAmount = parseFloat(order.total_amount || order.total || 0);
                const deliveryFee = parseFloat(order.delivery_fee || order.frais_livraison || 0);
                const total = totalAmount + deliveryFee;
                
                return (
                  <>
                    <p className="text-lg font-bold text-green-600">
                      {total.toFixed(2)}€
                    </p>
                    <p className="text-sm text-gray-500">
                      Gain: {deliveryFee.toFixed(2)}€
                    </p>
                  </>
                );
              })()}
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

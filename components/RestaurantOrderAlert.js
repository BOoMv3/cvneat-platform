'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function RestaurantOrderAlert() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingOrders();
    
    // Écouter les nouvelles commandes en temps réel
    const channel = supabase
      .channel('restaurant-orders')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'commandes',
          filter: 'statut=eq.en_attente'
        }, 
        (payload) => {
          console.log('Nouvelle commande reçue:', payload.new);
          setOrders(prev => [payload.new, ...prev]);
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'commandes',
          filter: 'statut=eq.en_attente'
        }, 
        (payload) => {
          console.log('Commande mise à jour:', payload.new);
          fetchPendingOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select('*')
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erreur récupération commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from('commandes')
        .update({ 
          statut: 'en_preparation',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Retirer la commande de la liste
      setOrders(prev => prev.filter(order => order.id !== orderId));
      
      // Notifier les livreurs
      await notifyDeliveryDrivers(orderId);
      
    } catch (error) {
      console.error('Erreur acceptation commande:', error);
      alert('Erreur lors de l\'acceptation de la commande');
    }
  };

  const handleRejectOrder = async (orderId) => {
    try {
      // Demander la raison du refus
      const reason = prompt('Raison du refus de la commande (optionnel):') || 'Non spécifiée';
      
      // Mettre à jour le statut de la commande
      const { error } = await supabase
        .from('commandes')
        .update({ 
          statut: 'annulee',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Rembourser automatiquement la commande
      try {
        const refundResponse = await fetch('/api/orders/refund', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderId,
            reason: `Refusé par le restaurant: ${reason}`
          })
        });

        if (refundResponse.ok) {
          console.log('✅ Remboursement effectué automatiquement');
        } else {
          console.error('❌ Erreur remboursement automatique');
        }
      } catch (refundError) {
        console.error('Erreur remboursement:', refundError);
        // Ne pas bloquer le rejet si le remboursement échoue
      }
      
      // Retirer la commande de la liste
      setOrders(prev => prev.filter(order => order.id !== orderId));
      
      // Notifier le client
      await notifyCustomerRejection(orderId, reason);
      
    } catch (error) {
      console.error('Erreur rejet commande:', error);
      alert('Erreur lors du rejet de la commande');
    }
  };

  // Fonction pour notifier le client du refus
  const notifyCustomerRejection = async (orderId, reason) => {
    try {
      // Récupérer les infos de la commande
      const { data: order } = await supabase
        .from('orders')
        .select('customer_email, customer_name, customer_phone, total_amount')
        .eq('id', orderId)
        .single();

      if (!order) return;

      console.log(`📧 Notification refus envoyée à ${order.customer_email}`);
      console.log(`💰 Montant à rembourser: ${order.total_amount}€`);
      console.log(`📝 Raison: ${reason}`);

      // Ici vous pouvez intégrer un service d'email/SMS
      // await sendRejectionEmail(order.customer_email, orderId, reason);
      // await sendRejectionSMS(order.customer_phone, orderId, reason);

    } catch (error) {
      console.error('Erreur notification refus:', error);
    }
  };

  const notifyDeliveryDrivers = async (orderId) => {
    try {
      // Mettre à jour le statut pour notifier les livreurs
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'ready',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur notification livreurs:', error);
    }
  };

  const calculateEstimatedTime = (items) => {
    // Estimation basée sur le nombre d'articles
    const baseTime = 15; // 15 minutes de base
    const itemTime = items.length * 5; // 5 minutes par article
    return baseTime + itemTime;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">Aucune commande en attente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        🚨 Commandes en Attente ({orders.length})
      </h2>
      
      {orders.map((order) => (
        <div key={order.id} className="bg-white border-2 border-orange-300 rounded-lg p-6 shadow-lg">
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
              <p className="text-lg font-bold text-gray-800">
                Total: {order.total_amount + (order.delivery_fee || 0)}€
              </p>
              <p className="text-sm font-semibold text-green-600">
                Votre gain: {(order.total_amount * 0.80).toFixed(2)}€
              </p>
              <p className="text-xs text-gray-500">
                (Commission 20%: {(order.total_amount * 0.20).toFixed(2)}€)
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Temps estimé: {calculateEstimatedTime(order.items)} min
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Client:</h4>
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
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total:</span>
                <span>{order.total_amount}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Frais de livraison:</span>
                <span>{order.delivery_fee}€</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>{order.total_amount + order.delivery_fee}€</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => handleAcceptOrder(order.id)}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              ✅ Accepter
            </button>
            <button
              onClick={() => handleRejectOrder(order.id)}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              ❌ Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

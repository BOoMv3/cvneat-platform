'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';

export default function OrderStatusNotification({ orderId }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    // Récupérer les infos de la commande
    fetchOrderDetails();

    // Écouter les changements de statut en temps réel
    const subscription = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'commandes',
          filter: `id=eq.${orderId}`
        }, 
        (payload) => {
          console.log('🔄 Statut commande mis à jour:', payload.new);
          setOrder(payload.new);
          setShowNotification(true);
          
          // Masquer la notification après 5 secondes
          setTimeout(() => setShowNotification(false), 5000);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Erreur récupération commande:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (statut) => {
    // Normaliser les statuts (accepter les deux formats)
    const status = statut || order?.statut;
    switch (status) {
      case 'acceptee':
      case 'accepted':
        return <FaCheckCircle className="text-green-500" />;
      case 'refusee':
      case 'rejected':
        return <FaTimesCircle className="text-red-500" />;
      case 'en_preparation':
      case 'preparing':
        return <FaClock className="text-yellow-500" />;
      case 'pret_a_livrer':
      case 'ready':
        return <FaCheckCircle className="text-blue-500" />;
      case 'livree':
      case 'delivered':
        return <FaCheckCircle className="text-green-600" />;
      case 'annulee':
      case 'cancelled':
        return <FaTimesCircle className="text-gray-500" />;
      default:
        return <FaExclamationTriangle className="text-orange-500" />;
    }
  };

  const getStatusMessage = (statut, rejectionReason) => {
    // Normaliser les statuts
    const status = statut || order?.statut;
    switch (status) {
      case 'en_attente':
      case 'pending':
        return 'Votre commande est en attente de confirmation...';
      case 'acceptee':
      case 'accepted':
        return 'Votre commande a été acceptée et est en préparation !';
      case 'refusee':
      case 'rejected':
        return `Votre commande a été refusée. ${rejectionReason ? `Raison: ${rejectionReason}` : ''}`;
      case 'en_preparation':
      case 'preparing':
        return 'Votre commande est en cours de préparation...';
      case 'pret_a_livrer':
      case 'ready':
        return 'Votre commande est prête ! Un livreur va la récupérer.';
      case 'en_livraison':
        return 'Votre commande est en cours de livraison...';
      case 'livree':
      case 'delivered':
        return 'Votre commande a été livrée ! Bon appétit !';
      case 'annulee':
      case 'cancelled':
        return 'Votre commande a été annulée et remboursée.';
      default:
        return 'Statut de commande inconnu.';
    }
  };

  const getStatusColor = (statut) => {
    // Normaliser les statuts
    const status = statut || order?.statut;
    switch (status) {
      case 'acceptee':
      case 'accepted':
      case 'livree':
      case 'delivered':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'refusee':
      case 'rejected':
      case 'annulee':
      case 'cancelled':
        return 'bg-red-100 border-red-500 text-red-800';
      case 'en_preparation':
      case 'preparing':
      case 'pret_a_livrer':
      case 'ready':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'en_attente':
      case 'pending':
        return 'bg-blue-100 border-blue-500 text-blue-800';
      case 'en_livraison':
        return 'bg-purple-100 border-purple-500 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white p-4 rounded-lg shadow-lg border">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <>
      {/* Notification toast */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`p-4 rounded-lg shadow-lg border-l-4 ${getStatusColor(order.statut)} max-w-sm`}>
            <div className="flex items-center space-x-3">
              {getStatusIcon(order.statut)}
              <div className="flex-1">
                <h4 className="font-semibold">Commande #{order.id}</h4>
                <p className="text-sm">{getStatusMessage(order.statut, order.rejection_reason)}</p>
                {(order.statut === 'refusee' || order.statut === 'rejected') && order.refund_amount && (
                  <p className="text-xs mt-1">
                    💰 Remboursement de {order.refund_amount}€ en cours...
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

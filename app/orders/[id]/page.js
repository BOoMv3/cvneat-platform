'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaArrowLeft, FaClock, FaCheckCircle, FaTimesCircle, FaSpinner, FaUtensils, FaBox, FaTruck } from 'react-icons/fa';
import NotificationPermission from '../../components/NotificationPermission';
import { sendOrderStatusNotification, saveNotificationPreferences } from '../../utils/notifications';

export default function OrderStatus({ params }) {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusNotification, setStatusNotification] = useState(null);

  useEffect(() => {
    if (params.id) {
      fetchOrder();
      setupRealtimeSubscription();
    }
  }, [params.id]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('order_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${params.id}`
        },
        (payload) => {
          console.log('Statut de commande mis à jour:', payload.new);
          setOrder(payload.new);
          
          // Afficher une notification de changement de statut
          const statusMessages = {
            'accepted': 'Votre commande a été acceptée ! 🎉',
            'preparing': 'Votre commande est en préparation 👨‍🍳',
            'ready': 'Votre commande est prête ! 📦',
            'delivered': 'Votre commande a été livrée ! 🚚',
            'rejected': 'Votre commande a été refusée ❌'
          };
          
          if (statusMessages[payload.new.status]) {
            setStatusNotification(statusMessages[payload.new.status]);
            setTimeout(() => setStatusNotification(null), 5000);
            
            // Envoyer une notification push
            sendOrderStatusNotification(payload.new.id, payload.new.status, payload.new);
          }
        }
      )
      .subscribe();
  };

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}`);
      if (!response.ok) {
        throw new Error('Commande non trouvée');
      }
      const data = await response.json();
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status) => {
    const steps = [
      { key: 'pending', label: 'En attente', icon: FaClock, color: 'text-yellow-500' },
      { key: 'accepted', label: 'Acceptée', icon: FaCheckCircle, color: 'text-green-500' },
      { key: 'preparing', label: 'En préparation', icon: FaUtensils, color: 'text-blue-500' },
      { key: 'ready', label: 'Prête', icon: FaBox, color: 'text-purple-500' },
      { key: 'delivered', label: 'Livrée', icon: FaTruck, color: 'text-gray-500' }
    ];
    
    const currentIndex = steps.findIndex(step => step.key === status);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Commande non trouvée</h1>
          <p className="text-gray-600 mb-4">Cette commande n'existe pas ou a été supprimée.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const statusSteps = getStatusStep(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification de changement de statut */}
      {statusNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          <div className="flex items-center">
            <span className="mr-2">🔔</span>
            <div>
              <p className="font-semibold">{statusNotification}</p>
            </div>
            <button 
              onClick={() => setStatusNotification(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* En-tête */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="mr-4 p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Suivi de commande</h1>
            <p className="text-gray-600">Commande #{order.id}</p>
          </div>
        </div>

        {/* Composant de notification */}
        <NotificationPermission orderId={order.id} />

        {/* Statut actuel */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Statut de votre commande</h2>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {order.status === 'pending' && 'En attente'}
              {order.status === 'accepted' && 'Acceptée'}
              {order.status === 'rejected' && 'Refusée'}
              {order.status === 'preparing' && 'En préparation'}
              {order.status === 'ready' && 'Prête'}
              {order.status === 'delivered' && 'Livrée'}
            </span>
          </div>

          {/* Timeline des étapes */}
          <div className="relative">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    step.completed 
                      ? 'bg-green-500 text-white' 
                      : step.current 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    <step.icon className="h-6 w-6" />
                  </div>
                  <p className={`text-sm text-center ${
                    step.completed || step.current ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Ligne de connexion */}
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200 -z-10">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ 
                  width: `${(statusSteps.filter(s => s.completed).length / (statusSteps.length - 1)) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Détails de la commande */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informations de la commande */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Détails de la commande</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Restaurant</p>
                <p className="font-medium">{order.restaurant_name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Date de commande</p>
                <p className="font-medium">{formatDate(order.created_at)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="font-medium text-lg">{order.total_amount.toFixed(2)}€</p>
              </div>
            </div>

            {/* Articles commandés */}
            <div className="mt-6">
              <h4 className="font-medium mb-3">Articles commandés</h4>
              <div className="space-y-2">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{(item.price * item.quantity).toFixed(2)}€</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-3 pt-3">
                <div className="flex justify-between text-sm">
                  <span>Frais de livraison</span>
                  <span>{order.delivery_fee.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{order.total_amount.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>

          {/* Informations de livraison */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Informations de livraison</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Nom</p>
                <p className="font-medium">{order.customer_name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Téléphone</p>
                <p className="font-medium">{order.customer_phone}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Adresse de livraison</p>
                <p className="font-medium">{order.delivery_address}</p>
                <p className="font-medium">{order.delivery_city} {order.delivery_postal_code}</p>
              </div>
              
              {order.delivery_instructions && (
                <div>
                  <p className="text-sm text-gray-600">Instructions spéciales</p>
                  <p className="font-medium">{order.delivery_instructions}</p>
                </div>
              )}
            </div>

            {/* Message de refus si applicable */}
            {order.status === 'rejected' && order.rejection_reason && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Raison du refus</h4>
                <p className="text-red-700">{order.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
} 
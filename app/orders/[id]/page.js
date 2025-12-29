'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaArrowLeft, FaClock, FaCheckCircle, FaTimesCircle, FaSpinner, FaUtensils, FaBox, FaTruck, FaExclamationTriangle } from 'react-icons/fa';
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
          table: 'commandes',
          filter: `id=eq.${params.id}`
        },
        (payload) => {
          console.log('Statut de commande mis à jour:', payload.new);
          setOrder(payload.new);
          
          // Gérer les notifications avec ready_for_delivery
          let notificationStatus = payload.new.statut;
          if (payload.new.statut === 'en_preparation' && payload.new.ready_for_delivery === true) {
            notificationStatus = 'pret_a_livrer';
          }
          
          const statusMessages = {
            'accepted': 'Votre commande a été acceptée ! 🎉',
            'preparing': 'Votre commande est en préparation 👨‍🍳',
            'ready': 'Votre commande est prête ! 📦',
            'pret_a_livrer': 'Votre commande est prête ! 📦',
            'en_preparation': payload.new.ready_for_delivery ? 'Votre commande est prête ! 📦' : 'Votre commande est en préparation 👨‍🍳',
            'en_livraison': 'Votre commande est en route vers vous ! 🚚',
            'delivered': 'Votre commande a été livrée ! 🚚',
            'livree': 'Votre commande a été livrée ! ✅',
            'rejected': payload.new.rejection_reason 
              ? `Votre commande a été refusée ❌\nRaison: ${payload.new.rejection_reason}`
              : 'Votre commande a été refusée ❌',
            'refusee': payload.new.rejection_reason 
              ? `Votre commande a été refusée ❌\nRaison: ${payload.new.rejection_reason}`
              : 'Votre commande a été refusée ❌',
            'annulee': 'Votre commande a été annulée ❌'
          };
          
          if (statusMessages[notificationStatus] || statusMessages[payload.new.statut]) {
            setStatusNotification(statusMessages[notificationStatus] || statusMessages[payload.new.statut]);
            setTimeout(() => setStatusNotification(null), 5000);
            
            // Envoyer une notification push avec la raison
            sendOrderStatusNotification(payload.new.id, notificationStatus || payload.new.statut, {
              ...payload.new,
              rejection_reason: payload.new.rejection_reason,
              rejectionReason: payload.new.rejection_reason
            });
          }
        }
      )
      .subscribe();
  };

  const fetchOrder = async () => {
    try {
      console.log('🔍 Récupération directe de la commande:', params.id);
      
      // Récupération directe depuis Supabase
      const { data: order, error } = await supabase
        .from('commandes')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('❌ Erreur récupération commande:', error);
        throw new Error('Commande non trouvée');
      }

      if (!order) {
        console.log('❌ Aucune commande trouvée pour l\'ID:', params.id);
        throw new Error('Commande non trouvée');
      }

      console.log('✅ Commande trouvée:', order);
      setOrder(order);
    } catch (err) {
      console.error('❌ Erreur fetchOrder:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status, readyForDelivery = false) => {
    // Si la commande est prête, modifier le label de l'étape "en_preparation"
    const steps = [
      { key: 'en_attente', label: 'En attente', icon: FaClock, color: 'text-yellow-500' },
      { 
        key: 'en_preparation', 
        label: readyForDelivery ? 'Prête' : 'En préparation', 
        icon: readyForDelivery ? FaBox : FaUtensils, 
        color: readyForDelivery ? 'text-green-500' : 'text-blue-500' 
      },
      { key: 'en_livraison', label: 'En livraison', icon: FaTruck, color: 'text-purple-500' },
      { key: 'livree', label: 'Livrée', icon: FaCheckCircle, color: 'text-green-600' }
    ];
    
    const currentIndex = steps.findIndex(step => step.key === status);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex
    }));
  };

  const getStatusColor = (status, readyForDelivery = false) => {
    // Si la commande est prête (ready_for_delivery = true), utiliser la couleur verte
    if (status === 'en_preparation' && readyForDelivery) {
      return 'bg-green-100 text-green-800';
    }
    
    switch (status) {
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800';
      case 'en_preparation':
        return 'bg-blue-100 text-blue-800';
      case 'en_livraison':
        return 'bg-purple-100 text-purple-800';
      case 'livree':
        return 'bg-green-100 text-green-800';
      case 'annulee':
        return 'bg-red-100 text-red-800';
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

  const statusSteps = getStatusStep(order.statut, order.ready_for_delivery);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
            onClick={() => router.back()}
            className="mr-4 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors shadow-sm"
            title="Retour"
          >
            <FaArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Suivi de commande</h1>
            <p className="text-gray-600 dark:text-gray-400">Commande #{order.id}</p>
          </div>
        </div>

        {/* Composant de notification */}
        <NotificationPermission orderId={order.id} />

        {/* Statut actuel */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Statut de votre commande</h2>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.statut, order.ready_for_delivery)}`}>
              {order.statut === 'en_attente' && 'En attente'}
              {order.statut === 'en_preparation' && order.ready_for_delivery && 'Prête'}
              {order.statut === 'en_preparation' && !order.ready_for_delivery && 'En préparation'}
              {order.statut === 'en_livraison' && 'En livraison'}
              {order.statut === 'livree' && 'Livrée'}
              {order.statut === 'annulee' && 'Annulée'}
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
                <p className="font-medium text-lg">{order.total.toFixed(2)}€</p>
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
                  <span>{order.frais_livraison.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{order.total.toFixed(2)}€</span>
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
                <p className="font-medium">{order.adresse_livraison}</p>
              </div>
              
              {order.delivery_instructions && (
                <div>
                  <p className="text-sm text-gray-600">Instructions spéciales</p>
                  <p className="font-medium">{order.delivery_instructions}</p>
                </div>
              )}
            </div>

            {/* Message de refus si applicable */}
            {((order.status === 'rejected' || order.status === 'refusee' || order.statut === 'refusee' || order.statut === 'rejected') && (order.rejection_reason || order.rejectionReason)) && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">📋 Raison du refus</h4>
                <p className="text-red-700">{order.rejection_reason || order.rejectionReason}</p>
                <p className="text-sm text-red-600 mt-2">
                  Votre paiement sera remboursé automatiquement dans les plus brefs délais.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-4">
          {order.status === 'delivered' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Commande livrée avec succès !
                  </h3>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                    <p>Votre commande a été livrée. Si vous rencontrez un problème, vous pouvez nous le signaler dans les 48h.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {order.status === 'delivered' && (
              <button
                onClick={() => router.push(`/complaint/${params.id}`)}
                className="bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center font-semibold shadow-lg"
              >
                <FaExclamationTriangle className="mr-2" />
                Signaler un problème
              </button>
            )}
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
'use client';
import { useState, useEffect } from 'react';
import { FaBell, FaClock, FaMapMarkerAlt, FaMotorcycle } from 'react-icons/fa';

export default function PreventiveAlert({ order, onAccept, onDismiss }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const prepStart = order.preparation_started_at || order.accepted_at || order.created_at;
    if (!order.preparation_time || !prepStart) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const preparationStart = new Date(prepStart);
      const preparationEnd = new Date(preparationStart.getTime() + (order.preparation_time * 60 * 1000));
      const remaining = preparationEnd.getTime() - now.getTime();
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        return;
      }
      
      const minutes = Math.floor(remaining / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
      
      setTimeRemaining({ minutes, seconds, total: remaining });
    };

    // Calculer immédiatement
    calculateTimeRemaining();

    // Mettre à jour toutes les secondes
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [order.preparation_time, order.preparation_started_at, order.accepted_at, order.created_at]);

  const handleAccept = () => {
    if (onAccept) {
      onAccept(order.id);
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(order.id);
    }
    setIsVisible(false);
  };

  if (!isVisible || !timeRemaining) {
    return null;
  }

  const isUrgent = timeRemaining.minutes <= 5;
  const isVeryUrgent = timeRemaining.minutes <= 2;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-lg border-l-4 ${
      isVeryUrgent ? 'border-red-500' : 
      isUrgent ? 'border-orange-500' : 
      'border-blue-500'
    } animate-slide-in`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <FaBell className={`text-lg ${
                isVeryUrgent ? 'text-red-500' : 
                isUrgent ? 'text-orange-500' : 
                'text-blue-500'
              }`} />
              <h3 className="font-bold text-gray-900">
                {isVeryUrgent ? '🚨 Course URGENTE' : 
                 isUrgent ? '⚠️ Course bientôt prête' : 
                 '📦 Nouvelle course disponible'}
              </h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FaClock className="text-gray-400" />
                <span>
                  {timeRemaining.minutes > 0 ? `${timeRemaining.minutes}m ${timeRemaining.seconds}s` : `${timeRemaining.seconds}s`}
                  {' '}restantes
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FaMapMarkerAlt className="text-gray-400" />
                <span>{order.restaurant?.nom || 'Restaurant'}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FaMotorcycle className="text-gray-400" />
                <span>Vers {order.delivery_address}</span>
              </div>
              
              <div className="text-sm font-semibold text-green-600">
                💰 {order.delivery_fee}€ de frais
              </div>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="mt-4 flex space-x-2">
          <button
            onClick={handleAccept}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
              isVeryUrgent ? 'bg-red-500 hover:bg-red-600' : 
              isUrgent ? 'bg-orange-500 hover:bg-orange-600' : 
              'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            Accepter la course
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

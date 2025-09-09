'use client';
import { useState, useEffect } from 'react';

export default function OrderCountdown({ order, onTimeUp }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!order.preparation_time || !order.updated_at) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const preparationStart = new Date(order.updated_at);
      const preparationEnd = new Date(preparationStart.getTime() + (order.preparation_time * 60 * 1000));
      const remaining = preparationEnd.getTime() - now.getTime();
      
      if (remaining <= 0) {
        setIsExpired(true);
        setTimeRemaining(0);
        if (onTimeUp) onTimeUp(order.id);
        return;
      }
      
      const minutes = Math.floor(remaining / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
      
      setTimeRemaining({ minutes, seconds, total: remaining });
      setIsExpired(false);
    };

    // Calculer immédiatement
    calculateTimeRemaining();

    // Mettre à jour toutes les secondes
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [order.preparation_time, order.updated_at, onTimeUp]);

  if (!timeRemaining && !isExpired) {
    return (
      <div className="text-sm text-gray-500">
        ⏰ Temps non disponible
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="text-sm text-red-600 font-semibold">
        ⚠️ Commande prête !
      </div>
    );
  }

  const isUrgent = timeRemaining.minutes <= 5;
  const isVeryUrgent = timeRemaining.minutes <= 2;

  return (
    <div className={`text-sm font-semibold ${
      isVeryUrgent ? 'text-red-600' : 
      isUrgent ? 'text-orange-600' : 
      'text-green-600'
    }`}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">
          {isVeryUrgent ? '🚨' : isUrgent ? '⚠️' : '⏰'}
        </span>
        <span>
          {timeRemaining.minutes > 0 ? `${timeRemaining.minutes}m ${timeRemaining.seconds}s` : `${timeRemaining.seconds}s`}
        </span>
        <span className="text-xs opacity-75">
          restantes
        </span>
      </div>
      
      {isUrgent && (
        <div className="text-xs mt-1 opacity-75">
          {isVeryUrgent ? 'Très urgent !' : 'Bientôt prêt'}
        </div>
      )}
    </div>
  );
}

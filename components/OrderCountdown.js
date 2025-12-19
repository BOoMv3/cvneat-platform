'use client';
import { useState, useEffect, useMemo } from 'react';

export default function OrderCountdown({ order, onTimeUp }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  // Mémoriser la date de début de préparation pour éviter qu'elle change quand updated_at change
  const preparationStartDate = useMemo(() => {
    const startSource =
      order.preparation_started_at ||
      order.accepted_at ||
      order.created_at;
    
    return startSource ? new Date(startSource) : null;
  }, [order.preparation_started_at, order.accepted_at, order.created_at]);

  useEffect(() => {
    if (!order.preparation_time || !preparationStartDate) {
      setTimeRemaining(null);
      setIsExpired(false);
      return;
    }

    let intervalId = null;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const preparationEnd = new Date(preparationStartDate.getTime() + (order.preparation_time * 60 * 1000));
      const remaining = preparationEnd.getTime() - now.getTime();
      
      if (remaining <= 0) {
        // Arrêter le timer une fois expiré
        setIsExpired(true);
        setTimeRemaining({ minutes: 0, seconds: 0, total: 0 });
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
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

    // Mettre à jour toutes les secondes seulement si pas expiré
    if (!isExpired) {
      intervalId = setInterval(() => {
        calculateTimeRemaining();
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [order.preparation_time, preparationStartDate, onTimeUp, isExpired]);

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

'use client';

import { FaFire, FaClock } from 'react-icons/fa';
import { useState, useEffect } from 'react';

// Date de la promotion (format YYYY-MM-DD)
const PROMO_DATE = '2025-11-21'; // MODIFIER CETTE DATE POUR ACTIVER LA PROMO

export default function FreeDeliveryBanner() {
  const [isPromoActive, setIsPromoActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const checkPromo = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // Format YYYY-MM-DD
      
      // Vérifier si c'est le jour de la promo
      if (today === PROMO_DATE) {
        setIsPromoActive(true);
        
        // Calculer le temps restant jusqu'à minuit
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const diff = endOfDay - now;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeLeft(`${hours}h ${minutes}min`);
      } else {
        setIsPromoActive(false);
      }
    };

    checkPromo();
    const interval = setInterval(checkPromo, 60000); // Mise à jour toutes les minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white py-2.5 px-3 shadow-md">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-2 text-center">
        <div className="font-extrabold text-sm sm:text-base">
          CVN&apos;EAT livre maintenant au Vigan
        </div>
        {isPromoActive && (
          <div className="flex items-center gap-1.5 bg-black/25 px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold">
            <FaFire className="w-3.5 h-3.5" />
            <span>Ce soir: livraison offerte des 25EUR</span>
            {timeLeft && (
              <>
                <FaClock className="w-3.5 h-3.5 ml-1" />
                <span>{timeLeft}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Fonction helper pour vérifier si la promo est active (utilisable partout)
export const isFreeDeliveryActive = () => {
  const today = new Date().toISOString().split('T')[0];
  return today === PROMO_DATE;
};


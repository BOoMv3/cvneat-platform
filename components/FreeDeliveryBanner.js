'use client';

import { FaTruck, FaFire, FaClock } from 'react-icons/fa';
import { useState, useEffect } from 'react';

// Date de la promotion (format YYYY-MM-DD)
const PROMO_DATE = '2024-11-21'; // MODIFIER CETTE DATE POUR ACTIVER LA PROMO

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

  if (!isPromoActive) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-4 px-4 shadow-lg animate-pulse">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <FaFire className="w-6 h-6 animate-bounce" />
          <span className="text-xl sm:text-2xl font-extrabold">🎉 OFFRE SPÉCIALE CE SOIR !</span>
          <FaFire className="w-6 h-6 animate-bounce" />
        </div>
        <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-full">
          <FaTruck className="w-5 h-5" />
          <span className="font-bold text-lg">LIVRAISON OFFERTE</span>
        </div>
        {timeLeft && (
          <div className="flex items-center gap-2 bg-black bg-opacity-30 px-3 py-1 rounded-full text-sm">
            <FaClock className="w-4 h-4" />
            <span>Plus que {timeLeft}</span>
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


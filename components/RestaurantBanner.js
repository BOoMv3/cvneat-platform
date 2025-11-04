'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaStar, FaClock, FaMotorcycle, FaMapMarkerAlt, FaHeart } from 'react-icons/fa';
import StarRating from './StarRating';

export default function RestaurantBanner({ restaurant, onToggleFavorite, isFavorite = false, hours = [], isOpen = true, isManuallyClosed = false }) {
  const [currentHours, setCurrentHours] = useState(null);
  
  useEffect(() => {
    if (hours && hours.length > 0) {
      const today = new Date().getDay(); // 0 = dimanche, 1 = lundi, etc.
      const todayHours = hours.find(h => h.day_of_week === today);
      setCurrentHours(todayHours || null);
      console.log('Horaires reçues:', hours);
      console.log('Jour actuel:', today);
      console.log('Horaires d\'aujourd\'hui:', todayHours);
    } else {
      console.log('Aucune horaire reçue ou tableau vide');
      setCurrentHours(null);
    }
  }, [hours]);

  if (!restaurant) return null;

  const formatHours = (hours) => {
    if (!hours || hours.length === 0) return 'Horaires non définis';
    
    return hours.map(h => {
      if (h.is_closed || !h.ouvert) return `${h.day}: Fermé`;
      return `${h.day}: ${h.ouverture || '00:00'} - ${h.fermeture || '00:00'}`;
    }).join(' | ');
  };

  return (
    <div className="relative w-full h-64 sm:h-72 md:h-80 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 overflow-hidden rounded-t-2xl sm:rounded-t-3xl">
      {/* Image de fond avec overlay */}
      <div className="absolute inset-0">
        {restaurant.banner_image ? (
          <Image
            src={restaurant.banner_image}
            alt={restaurant.nom}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : restaurant.profile_image ? (
          <Image
            src={restaurant.profile_image}
            alt={restaurant.nom}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : restaurant.image_url ? (
          <Image
            src={restaurant.image_url}
            alt={restaurant.nom}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800" />
        )}
      </div>

      {/* Overlay sombre - Plus sombre en bas pour améliorer la visibilité du texte */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60" />

      {/* Header avec bouton favoris seulement */}
      <div className="relative z-20 flex justify-end items-start p-2 sm:p-3 md:p-4">
        {/* Bouton favoris */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Clic sur le bouton favoris');
            if (onToggleFavorite) {
              onToggleFavorite();
            } else {
              console.error('onToggleFavorite n\'est pas défini');
            }
          }}
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-opacity-100 transition-all cursor-pointer z-30 relative"
          style={{ pointerEvents: 'auto' }}
        >
          <FaHeart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-800'}`} />
        </button>
      </div>

      {/* Logo et nom du restaurant centrés - Optimisé pour ne pas empiéter */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-2 sm:px-4 pb-16 sm:pb-20 md:pb-24">
        {/* Logo du restaurant */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-full shadow-2xl flex items-center justify-center mb-2 sm:mb-3 md:mb-4 border-2 sm:border-3 md:border-4 border-white">
          {restaurant.profile_image ? (
            <Image
              src={restaurant.profile_image}
              alt={`Logo ${restaurant.nom}`}
              width={64}
              height={64}
              className="rounded-full object-cover w-full h-full"
              sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
            />
          ) : restaurant.logo_image ? (
            <Image
              src={restaurant.logo_image}
              alt={`Logo ${restaurant.nom}`}
              width={64}
              height={64}
              className="rounded-full object-cover w-full h-full"
              sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                {restaurant.nom.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Nom du restaurant - Optimisé pour mobile avec meilleure visibilité */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center mb-1 sm:mb-2 px-2 line-clamp-2 break-words relative z-10" style={{ 
          textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 0, 0, 0.4)',
          WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.3)'
        }}>
          {restaurant.nom}
        </h1>

        {/* Sous-titre - Masqué sur très petits écrans avec meilleure visibilité */}
        {restaurant.description && (
          <p className="text-white text-center text-xs sm:text-sm md:text-lg mb-2 sm:mb-3 md:mb-4 px-2 line-clamp-2 hidden sm:block relative z-10" style={{ 
            textShadow: '2px 2px 6px rgba(0, 0, 0, 0.8), 0 0 15px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 0, 0, 0.4)',
            WebkitTextStroke: '0.3px rgba(0, 0, 0, 0.3)'
          }}>
            {restaurant.description}
          </p>
        )}
      </div>

      {/* Informations en bas - Position ajustée pour ne pas empiéter */}
      <div className="absolute -bottom-16 sm:-bottom-18 md:-bottom-20 left-0 right-0 bg-white dark:bg-gray-800 bg-opacity-95 backdrop-blur-sm p-3 sm:p-4 md:p-6 rounded-t-2xl sm:rounded-t-3xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <StarRating 
                rating={restaurant.rating || 0} 
                size="sm" 
                showValue={true}
              />
              <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">({restaurant.reviews_count || '0'} avis)</span>
            </div>
            <div className="flex items-center gap-1">
              <FaClock className="text-gray-600 dark:text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-gray-800 dark:text-gray-200 text-xs sm:text-sm">{restaurant.deliveryTime || '25'} min</span>
            </div>
            <div className="flex items-center gap-1">
              <FaMotorcycle className="text-gray-600 dark:text-gray-400 w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-gray-800 dark:text-gray-200 text-xs sm:text-sm">{restaurant.deliveryFee || '2.50'}€</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
          <FaMapMarkerAlt className="text-gray-500 dark:text-gray-500 flex-shrink-0 mt-0.5 w-3 h-3 sm:w-4 sm:h-4" />
          <span className="break-words leading-tight">{restaurant.adresse}, {restaurant.ville} {restaurant.code_postal}</span>
        </div>
        
        {/* Horaires d'ouverture */}
        <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm border-t border-gray-200 dark:border-gray-700 pt-2 sm:pt-3 mt-2 sm:mt-3">
          <FaClock className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0 w-3 h-3 sm:w-4 sm:h-4" />
          <div className="flex-1 min-w-0">
            <div className="text-gray-900 dark:text-gray-100 font-semibold mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">
              {isManuallyClosed ? (
                <span className="text-red-600 dark:text-red-400">🔴 Fermé manuellement</span>
              ) : !isOpen ? (
                <span className="text-orange-600 dark:text-orange-400">🟡 Fermé maintenant</span>
              ) : (
                <span className="text-green-600 dark:text-green-400">🟢 Ouvert maintenant</span>
              )}
            </div>
            {hours && hours.length > 0 ? (
              <div className="space-y-1 sm:space-y-2">
                {currentHours && currentHours.ouvert && !currentHours.is_closed && (
                  <div className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium">
                    Aujourd'hui ({currentHours.day}): {currentHours.ouverture} - {currentHours.fermeture}
                  </div>
                )}
                {!currentHours || !currentHours.ouvert || currentHours.is_closed ? (
                  currentHours && (
                    <div className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                      Fermé aujourd'hui ({currentHours.day})
                    </div>
                  )
                ) : null}
                <details className="mt-1 sm:mt-2">
                  <summary className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 font-medium underline">
                    Voir tous les horaires →
                  </summary>
                  <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-1 sm:space-y-2 bg-gray-50 dark:bg-gray-800/50 p-2 sm:p-3 rounded-lg">
                    {hours.map((h, i) => (
                      <div key={i} className="flex justify-between items-center py-0.5 sm:py-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm">{h.day}</span>
                        <span className={`text-xs sm:text-sm ${h.is_closed || !h.ouvert ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {h.is_closed || !h.ouvert ? 'Fermé' : `${h.ouverture || '00:00'} - ${h.fermeture || '00:00'}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm italic">
                Horaires non définis
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
} 
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
      setCurrentHours(todayHours);
    }
  }, [hours]);

  if (!restaurant) return null;

  const formatHours = (hours) => {
    if (!hours || hours.length === 0) return 'Horaires non définis';
    
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return hours.map(h => {
      const dayName = days[h.day_of_week] || `Jour ${h.day_of_week}`;
      if (h.is_closed) return `${dayName}: Fermé`;
      return `${dayName}: ${h.open_time || '00:00'} - ${h.close_time || '00:00'}`;
    }).join(' | ');
  };

  return (
    <div className="relative w-full h-80 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 overflow-hidden">
      {/* Image de fond avec overlay */}
      <div className="absolute inset-0">
        {restaurant.banner_image ? (
          <Image
            src={restaurant.banner_image}
            alt={restaurant.nom}
            fill
            className="object-cover"
            priority
          />
        ) : restaurant.profile_image ? (
          <Image
            src={restaurant.profile_image}
            alt={restaurant.nom}
            fill
            className="object-cover"
            priority
          />
        ) : restaurant.image_url ? (
          <Image
            src={restaurant.image_url}
            alt={restaurant.nom}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800" />
        )}
      </div>

      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />

      {/* Header avec bouton favoris seulement */}
      <div className="relative z-20 flex justify-end items-start p-4">
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
          className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-opacity-100 transition-all cursor-pointer z-30 relative"
          style={{ pointerEvents: 'auto' }}
        >
          <FaHeart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-800'}`} />
        </button>
      </div>

      {/* Logo et nom du restaurant centrés */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full -mt-16">
        {/* Logo du restaurant */}
        <div className="w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center mb-4 border-4 border-white">
          {restaurant.profile_image ? (
            <Image
              src={restaurant.profile_image}
              alt={`Logo ${restaurant.nom}`}
              width={80}
              height={80}
              className="rounded-full object-cover"
            />
          ) : restaurant.logo_image ? (
            <Image
              src={restaurant.logo_image}
              alt={`Logo ${restaurant.nom}`}
              width={80}
              height={80}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {restaurant.nom.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Nom du restaurant */}
        <h1 className="text-3xl font-bold text-white text-center mb-2 drop-shadow-lg">
          {restaurant.nom}
        </h1>

        {/* Sous-titre */}
        <p className="text-white text-center text-lg opacity-90 mb-4 drop-shadow-lg">
          {restaurant.description}
        </p>
      </div>

      {/* Informations en bas */}
      <div className="absolute -bottom-20 left-0 right-0 bg-white bg-opacity-95 backdrop-blur-sm p-4 rounded-t-3xl shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <StarRating 
                rating={restaurant.rating || 0} 
                size="sm" 
                showValue={true}
              />
              <span className="text-gray-600 text-sm">({restaurant.reviews_count || '0'} avis)</span>
            </div>
            <div className="flex items-center gap-1">
              <FaClock className="text-gray-600" />
              <span className="text-gray-800">{restaurant.deliveryTime || '25'} min</span>
            </div>
            <div className="flex items-center gap-1">
              <FaMotorcycle className="text-gray-600" />
              <span className="text-gray-800">{restaurant.deliveryFee || '2.50'}€</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <FaMapMarkerAlt className="text-gray-500" />
          <span>{restaurant.adresse}, {restaurant.ville} {restaurant.code_postal}</span>
        </div>
        
        {/* Horaires d'ouverture */}
        {hours && hours.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <FaClock className="text-gray-500 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-gray-800 font-medium mb-1">
                {isManuallyClosed ? (
                  <span className="text-red-600">🔴 Fermé manuellement</span>
                ) : !isOpen ? (
                  <span className="text-orange-600">🟡 Fermé maintenant</span>
                ) : (
                  <span className="text-green-600">🟢 Ouvert maintenant</span>
                )}
              </div>
              {currentHours && !currentHours.is_closed && (
                <div className="text-gray-600 text-xs">
                  Aujourd'hui: {currentHours.open_time} - {currentHours.close_time}
                </div>
              )}
              <details className="mt-1">
                <summary className="text-gray-600 text-xs cursor-pointer hover:text-gray-800">Voir tous les horaires</summary>
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  {formatHours(hours).split(' | ').map((h, i) => (
                    <div key={i}>{h}</div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>

    </div>
  );
} 
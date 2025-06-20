'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FaStar, FaClock, FaMotorcycle, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

export default function RestaurantCard({ restaurant, onClick, isSponsored = false }) {
  const [imageError, setImageError] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => setIsPressed(true);
  const handleTouchEnd = () => setIsPressed(false);

  const handleClick = () => {
    if (onClick) onClick(restaurant);
  };

  return (
    <div
      className={`
        relative bg-white rounded-xl shadow-sm overflow-hidden
        transform transition-all duration-200 ease-out
        ${isPressed ? 'scale-95 shadow-lg' : 'hover:scale-[1.02] hover:shadow-md'}
        ${isSponsored ? 'ring-2 ring-yellow-400' : ''}
        cursor-pointer select-none
        touch-manipulation
      `}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Badge sponsorisé */}
      {isSponsored && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
            ⭐ Sponsorisé
          </span>
        </div>
      )}

      {/* Image du restaurant */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden">
        {!imageError ? (
          <Image
            src={restaurant.image_url || '/default-restaurant.jpg'}
            alt={restaurant.nom}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            onError={() => setImageError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-4xl">🍽️</span>
          </div>
        )}
        
        {/* Overlay pour les informations rapides */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <FaStar className="text-yellow-400 text-sm" />
              <span className="text-sm font-medium">
                {restaurant.note || '4.5'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <FaClock className="text-sm" />
              <span className="text-xs">20-30 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu de la carte */}
      <div className="p-4 space-y-3">
        {/* Nom et type de cuisine */}
        <div>
          <h3 className="font-bold text-lg text-gray-900 line-clamp-1">
            {restaurant.nom}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-1">
            {restaurant.type_cuisine || 'Cuisine variée'}
          </p>
        </div>

        {/* Informations pratiques */}
        <div className="space-y-2">
          {/* Adresse */}
          <div className="flex items-start space-x-2">
            <FaMapMarkerAlt className="text-gray-400 text-sm mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 line-clamp-2">
              {restaurant.adresse}
            </p>
          </div>

          {/* Frais de livraison */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaMotorcycle className="text-gray-400 text-sm" />
              <span className="text-xs text-gray-600">
                {restaurant.frais_livraison ? `${restaurant.frais_livraison}€` : 'Gratuit'}
              </span>
            </div>
            
            {/* Statut d'ouverture */}
            <span className={`
              text-xs px-2 py-1 rounded-full font-medium
              ${restaurant.ouvert ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
            `}>
              {restaurant.ouvert ? 'Ouvert' : 'Fermé'}
            </span>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="flex space-x-2 pt-2">
          <button
            className="flex-1 bg-black text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            Voir le menu
          </button>
          
          <button
            className="p-2 text-gray-600 hover:text-black transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (restaurant.telephone) {
                window.location.href = `tel:${restaurant.telephone}`;
              }
            }}
          >
            <FaPhone className="text-sm" />
          </button>
        </div>
      </div>

      {/* Indicateur de chargement tactile */}
      <div className={`
        absolute inset-0 bg-black/5 rounded-xl
        transition-opacity duration-200
        ${isPressed ? 'opacity-100' : 'opacity-0'}
        pointer-events-none
      `} />
    </div>
  );
} 
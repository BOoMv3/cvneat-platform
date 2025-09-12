'use client';

import Image from 'next/image';
import { FaStar, FaClock, FaMotorcycle, FaMapMarkerAlt, FaHeart } from 'react-icons/fa';

export default function RestaurantBanner({ restaurant, onToggleFavorite, isFavorite = false }) {
  if (!restaurant) return null;

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
            <div className="flex items-center gap-1">
              <FaStar className="text-yellow-400 text-lg" />
              <span className="font-semibold text-gray-800">{restaurant.rating || '4.5'}</span>
              <span className="text-gray-600 text-sm">({restaurant.reviewCount || '100+'})</span>
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

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FaMapMarkerAlt className="text-gray-500" />
          <span>{restaurant.adresse}, {restaurant.ville} {restaurant.code_postal}</span>
        </div>
      </div>

    </div>
  );
} 
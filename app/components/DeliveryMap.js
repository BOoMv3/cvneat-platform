'use client';

import { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaRoute, FaClock } from 'react-icons/fa';

export default function DeliveryMap({ 
  restaurantCoordinates, 
  deliveryCoordinates, 
  distance, 
  estimatedTime,
  className = '' 
}) {
  const [mapLoaded, setMapLoaded] = useState(false);
  
  console.log('🗺️ DeliveryMap reçu:', {
    restaurantCoordinates,
    deliveryCoordinates,
    distance,
    estimatedTime
  });

  useEffect(() => {
    // Simulation du chargement de la carte
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Vérifier que les coordonnées existent et ont les propriétés nécessaires
  const hasValidCoords = restaurantCoordinates && deliveryCoordinates && 
                        restaurantCoordinates.lat && restaurantCoordinates.lng &&
                        deliveryCoordinates.lat && deliveryCoordinates.lng;
                        
  if (!hasValidCoords) {
    console.log('❌ DeliveryMap: Coordonnées invalides', {
      restaurantCoordinates,
      deliveryCoordinates,
      hasValidCoords
    });
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <FaMapMarkerAlt className="text-4xl text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Carte de livraison non disponible</p>
      </div>
    );
  }
  
  console.log('✅ DeliveryMap: Affichage de la carte');

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <FaRoute className="mr-2 text-blue-500" />
          Itinéraire de livraison
        </h3>
      </div>

      {/* Zone de la carte (simulation) */}
      <div className="relative h-64 bg-gradient-to-br from-blue-100 to-green-100 overflow-hidden">
        {!mapLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Chargement de la carte...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Restaurant marker */}
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: '30%',
                top: '40%'
              }}
            >
              <div className="bg-red-500 text-white p-2 rounded-full shadow-lg">
                <FaMapMarkerAlt className="text-sm" />
              </div>
              <div className="bg-white px-2 py-1 rounded text-xs font-medium shadow-sm mt-1">
                Restaurant
              </div>
            </div>

            {/* Delivery marker */}
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: '70%',
                top: '60%'
              }}
            >
              <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg">
                <FaMapMarkerAlt className="text-sm" />
              </div>
              <div className="bg-white px-2 py-1 rounded text-xs font-medium shadow-sm mt-1">
                Livraison
              </div>
            </div>

            {/* Route line */}
            <svg className="absolute inset-0 w-full h-full">
              <path
                d="M 30% 40% Q 50% 50% 70% 60%"
                stroke="#3B82F6"
                strokeWidth="3"
                fill="none"
                strokeDasharray="5,5"
              />
            </svg>
          </>
        )}
      </div>

      {/* Informations de livraison */}
      <div className="p-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-600">
            <FaRoute className="mr-2 text-blue-500" />
            <span>{distance} km</span>
          </div>
          <div className="flex items-center text-gray-600">
            <FaClock className="mr-2 text-green-500" />
            <span>~{estimatedTime} min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
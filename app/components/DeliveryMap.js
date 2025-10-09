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
  
  // Protection maximale contre undefined
  const safeRestaurantCoordinates = restaurantCoordinates || { lat: 43.9333, lng: 3.7167, address: 'Restaurant' };
  const safeDeliveryCoordinates = deliveryCoordinates || { lat: 43.9333, lng: 3.7167, address: 'Livraison' };
  const safeDistance = distance || "2.5";
  const safeEstimatedTime = estimatedTime || "15";
  
  console.log('🚀 NOUVEAU DeliveryMap - DEBUG COMPLET:', {
    restaurantCoordinates: safeRestaurantCoordinates,
    deliveryCoordinates: safeDeliveryCoordinates,
    distance: safeDistance,
    estimatedTime: safeEstimatedTime,
    restaurantLat: safeRestaurantCoordinates.lat,
    restaurantLng: safeRestaurantCoordinates.lng,
    deliveryLat: safeDeliveryCoordinates.lat,
    deliveryLng: safeDeliveryCoordinates.lng
  });

  useEffect(() => {
    console.log('🚀 DeliveryMap useEffect - Chargement carte');
    const timer = setTimeout(() => {
      console.log('🚀 DeliveryMap - Carte chargée');
      setMapLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  console.log('🚀 DeliveryMap - RENDU DE LA CARTE FORCÉ');

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
            <span>{safeDistance} km</span>
          </div>
          <div className="flex items-center text-gray-600">
            <FaClock className="mr-2 text-green-500" />
            <span>~{safeEstimatedTime} min</span>
          </div>
        </div>
        
        {/* Debug info */}
        <div className="mt-2 text-xs text-gray-500">
          <p>Debug: Restaurant ({safeRestaurantCoordinates.lat}, {safeRestaurantCoordinates.lng})</p>
          <p>Debug: Livraison ({safeDeliveryCoordinates.lat}, {safeDeliveryCoordinates.lng})</p>
        </div>
      </div>
    </div>
  );
}
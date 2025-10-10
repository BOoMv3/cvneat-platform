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
  const [currentPosition, setCurrentPosition] = useState(null);
  const [positionError, setPositionError] = useState(null);
  
  // Protection maximale contre undefined avec validation stricte
  const safeRestaurantCoordinates = (() => {
    if (!restaurantCoordinates || typeof restaurantCoordinates !== 'object') {
      console.log('⚠️ restaurantCoordinates invalide, utilisation des coordonnées par défaut');
      return { lat: 43.9333, lng: 3.7167, address: 'Restaurant' };
    }
    if (typeof restaurantCoordinates.lat !== 'number' || typeof restaurantCoordinates.lng !== 'number') {
      console.log('⚠️ Coordonnées restaurant invalides, utilisation des coordonnées par défaut');
      return { lat: 43.9333, lng: 3.7167, address: 'Restaurant' };
    }
    return restaurantCoordinates;
  })();
  
  const safeDeliveryCoordinates = (() => {
    if (!deliveryCoordinates || typeof deliveryCoordinates !== 'object') {
      console.log('⚠️ deliveryCoordinates invalide, utilisation des coordonnées par défaut');
      return { lat: 43.9333, lng: 3.7167, address: 'Livraison' };
    }
    if (typeof deliveryCoordinates.lat !== 'number' || typeof deliveryCoordinates.lng !== 'number') {
      console.log('⚠️ Coordonnées livraison invalides, utilisation des coordonnées par défaut');
      return { lat: 43.9333, lng: 3.7167, address: 'Livraison' };
    }
    return deliveryCoordinates;
  })();
  
  const safeDistance = distance || "2.5";
  const safeEstimatedTime = estimatedTime || "15";
  
  console.log('🚀 DeliveryMap - COORDONNÉES SÉCURISÉES:', {
    restaurantCoordinates: safeRestaurantCoordinates,
    deliveryCoordinates: safeDeliveryCoordinates,
    distance: safeDistance,
    estimatedTime: safeEstimatedTime,
    restaurantLat: safeRestaurantCoordinates.lat,
    restaurantLng: safeRestaurantCoordinates.lng,
    deliveryLat: safeDeliveryCoordinates.lat,
    deliveryLng: safeDeliveryCoordinates.lng
  });

  // Fonction de géolocalisation sécurisée
  const getCurrentPosition = () => {
    console.log('🌍 Demande de géolocalisation...');
    setPositionError(null);
    
    if (!navigator.geolocation) {
      console.log('❌ Géolocalisation non supportée par ce navigateur');
      setPositionError('Géolocalisation non supportée');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Position obtenue:', position.coords);
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        console.log('❌ Erreur géolocalisation:', error);
        let errorMessage = 'Erreur de géolocalisation';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permission de géolocalisation refusée';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position indisponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Délai dépassé';
            break;
        }
        setPositionError(errorMessage);
      },
      options
    );
  };

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
        
        {/* Position actuelle */}
        {currentPosition && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-xs text-green-700">
              📍 Ma position: ({currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)})
            </p>
            <p className="text-xs text-green-600">
              Précision: ±{currentPosition.accuracy}m
            </p>
          </div>
        )}
        
        {/* Erreur de géolocalisation */}
        {positionError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-xs text-red-700">
              ❌ {positionError}
            </p>
          </div>
        )}
        
        {/* Bouton de géolocalisation */}
        <div className="mt-3">
          <button
            onClick={getCurrentPosition}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            🌍 Ma position
          </button>
        </div>
        
        {/* Debug info */}
        <div className="mt-2 text-xs text-gray-500">
          <p>Debug: Restaurant ({safeRestaurantCoordinates.lat}, {safeRestaurantCoordinates.lng})</p>
          <p>Debug: Livraison ({safeDeliveryCoordinates.lat}, {safeDeliveryCoordinates.lng})</p>
          <p>Debug: Position actuelle: {currentPosition ? `(${currentPosition.lat}, ${currentPosition.lng})` : 'Non définie'}</p>
        </div>
      </div>
    </div>
  );
}
'use client';
import { useState, useEffect, useRef } from 'react';

export default function DeliveryMap({ currentOrder, deliveryLocation }) {
  const [map, setMap] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Initialisation de la carte (simulation)
    // En production, vous utiliseriez Google Maps, Mapbox, etc.
    if (mapRef.current && !map) {
      initializeMap();
    }
  }, [mapRef.current]);

  const initializeMap = () => {
    // Simulation d'une carte avec données réalistes
    setMap({
      id: 'delivery-map',
      center: { lat: 43.9333, lng: 3.7167 }, // Ganges, France
      zoom: 13,
      driverLocation: { lat: 43.9333, lng: 3.7167 },
      restaurantLocation: currentOrder?.restaurant_location || { lat: 43.9350, lng: 3.7200 },
      deliveryLocation: currentOrder?.delivery_location || { lat: 43.9300, lng: 3.7100 }
    });
  };

  const updateDeliveryLocation = (location) => {
    // Mise à jour de la position du livreur
    if (map) {
      setMap(prev => ({
        ...prev,
        driverLocation: location
      }));
      console.log('Position livreur mise à jour:', location);
    }
  };

  const showRoute = (origin, destination) => {
    // Affichage de l'itinéraire
    if (map && currentOrder) {
      const route = {
        origin: origin || map.driverLocation,
        destination: destination || map.deliveryLocation,
        distance: calculateDistance(origin || map.driverLocation, destination || map.deliveryLocation),
        duration: Math.round(calculateDistance(origin || map.driverLocation, destination || map.deliveryLocation) * 2) // 2 min par km
      };
      console.log('Itinéraire calculé:', route);
      return route;
    }
  };

  const calculateDistance = (point1, point2) => {
    // Calcul simple de distance (en km)
    const R = 6371; // Rayon de la Terre en km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 space-y-3 sm:space-y-0">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Carte de livraison</h3>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <button
            onClick={() => updateDeliveryLocation(deliveryLocation)}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            Ma position
          </button>
          {currentOrder && (
            <button
              onClick={() => showRoute(deliveryLocation, currentOrder.delivery_address)}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 min-h-[44px] touch-manipulation w-full sm:w-auto"
            >
              Itinéraire
            </button>
          )}
        </div>
      </div>
      
      <div 
        ref={mapRef}
        className="w-full h-48 sm:h-64 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center relative overflow-hidden"
      >
        <div className="text-center text-gray-600 z-10">
          <div className="text-3xl sm:text-4xl mb-2">🗺️</div>
          <p className="text-xs sm:text-sm font-medium">Carte de livraison</p>
          <p className="text-xs text-gray-500 mt-1">
            {currentOrder ? 'Commande en cours' : 'Aucune commande active'}
          </p>
          {map && (
            <div className="mt-2 text-xs text-gray-600">
              <p>📍 Position: {map.driverLocation.lat.toFixed(4)}, {map.driverLocation.lng.toFixed(4)}</p>
              {currentOrder && (
                <p>🎯 Destination: {currentOrder.delivery_address}</p>
              )}
            </div>
          )}
        </div>
        {/* Simulation de points sur la carte */}
        <div className="absolute top-4 left-4 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        <div className="absolute bottom-4 right-4 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
      </div>

      {currentOrder && (
        <div className="mt-3 sm:mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">Commande en cours</h4>
          <div className="text-xs sm:text-sm text-blue-800 space-y-1">
            <p><strong>Adresse:</strong> {currentOrder.delivery_address}</p>
            <p><strong>Distance:</strong> {currentOrder.distance || 'Calcul...'} km</p>
            <p><strong>Temps estimé:</strong> {currentOrder.estimated_time || 'Calcul...'} min</p>
          </div>
        </div>
      )}
    </div>
  );
} 
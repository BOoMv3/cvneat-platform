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
    // Simulation d'une carte
    // En production, remplacez par une vraie implémentation de carte
    setMap({
      id: 'delivery-map',
      center: { lat: 43.9333, lng: 3.7167 }, // Ganges, France
      zoom: 13
    });
  };

  const updateDeliveryLocation = (location) => {
    // Mise à jour de la position du livreur
    if (map) {
      console.log('Mise à jour position livreur:', location);
    }
  };

  const showRoute = (origin, destination) => {
    // Affichage de l'itinéraire
    if (map) {
      console.log('Affichage itinéraire:', { origin, destination });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Carte de livraison</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => updateDeliveryLocation(deliveryLocation)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Ma position
          </button>
          {currentOrder && (
            <button
              onClick={() => showRoute(deliveryLocation, currentOrder.delivery_address)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Itinéraire
            </button>
          )}
        </div>
      </div>
      
      <div 
        ref={mapRef}
        className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center"
      >
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="text-sm">Carte de livraison</p>
          <p className="text-xs text-gray-500 mt-1">
            {currentOrder ? 'Commande en cours' : 'Aucune commande active'}
          </p>
        </div>
      </div>

      {currentOrder && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Commande en cours</h4>
          <div className="text-sm text-blue-800">
            <p><strong>Adresse:</strong> {currentOrder.delivery_address}</p>
            <p><strong>Distance:</strong> {currentOrder.distance || 'Calcul...'} km</p>
            <p><strong>Temps estimé:</strong> {currentOrder.estimated_time || 'Calcul...'} min</p>
          </div>
        </div>
      )}
    </div>
  );
} 
'use client';
import { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaRoute, FaClock } from 'react-icons/fa';

export default function DeliveryMap({ currentOrder, deliveryAddress }) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    // Simuler le chargement de la carte
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!currentOrder) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <FaMapMarkerAlt className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Carte de livraison</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <FaMapMarkerAlt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Aucune livraison en cours</p>
          <p className="text-sm">La carte s'affichera ici quand vous aurez une commande</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FaMapMarkerAlt className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Carte de livraison</h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <FaClock className="h-4 w-4" />
          <span>Est. 15-20 min</span>
        </div>
      </div>

      {/* Carte simulée */}
      <div className="relative bg-gray-100 rounded-lg h-64 mb-4 overflow-hidden">
        {!mapLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="relative h-full">
            {/* Restaurant marker */}
            <div className="absolute top-4 left-4 bg-green-500 text-white p-2 rounded-full shadow-lg">
              <FaMapMarkerAlt className="h-4 w-4" />
            </div>
            
            {/* Delivery address marker */}
            <div className="absolute bottom-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg">
              <FaMapMarkerAlt className="h-4 w-4" />
            </div>
            
            {/* Route line */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-1 bg-blue-500 opacity-50 relative">
                <div className="absolute top-0 left-0 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Informations de livraison */}
      <div className="space-y-3">
        <div className="flex items-start space-x-3">
          <div className="bg-green-100 p-2 rounded-full">
            <FaMapMarkerAlt className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Restaurant</p>
            <p className="text-sm text-gray-600">{currentOrder.restaurant_nom}</p>
            <p className="text-xs text-gray-500">{currentOrder.restaurant_adresse}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="bg-red-100 p-2 rounded-full">
            <FaMapMarkerAlt className="h-4 w-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Adresse de livraison</p>
            <p className="text-sm text-gray-600">{currentOrder.delivery_address}</p>
            <p className="text-xs text-gray-500">Client: {currentOrder.customer_name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 pt-3 border-t">
          <div className="bg-blue-100 p-2 rounded-full">
            <FaRoute className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Distance estimée</p>
            <p className="text-sm text-gray-600">2.5 km • 15-20 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );
} 
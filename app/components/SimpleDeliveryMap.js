'use client';

import { useState, useEffect } from 'react';
import RealtimeTracker from './RealtimeTracker';

export default function SimpleDeliveryMap({ 
  restaurantAddress = "Restaurant", 
  deliveryAddress = "Adresse de livraison",
  className = '' 
}) {
  const [driverPosition, setDriverPosition] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);

  // Coordonnées fixes pour éviter les erreurs
  const restaurantCoords = { lat: 43.9333, lng: 3.7167 };
  const deliveryCoords = { lat: 43.9334, lng: 3.7168 };

  const startTracking = () => {
    console.log('🚀 Démarrage du suivi GPS...');
    setError(null);
    setIsTracking(true);

    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée');
      setIsTracking(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Position obtenue:', position.coords);
        setDriverPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setIsTracking(false);
      },
      (error) => {
        console.error('❌ Erreur GPS:', error);
        setError(`Erreur: ${error.message}`);
        setIsTracking(false);
      },
      options
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
        🗺️ Trajet de livraison
      </h3>

      {/* Carte simplifiée */}
      <div className="relative h-64 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg mb-4 overflow-hidden">
        
        {/* Restaurant (point rouge) */}
        <div className="absolute" style={{ left: '20%', top: '30%' }}>
          <div className="bg-red-500 text-white p-3 rounded-full shadow-lg flex items-center justify-center">
            <span className="text-sm font-bold">🍽️</span>
          </div>
          <div className="bg-white px-2 py-1 rounded text-xs font-medium shadow-sm mt-1 text-center">
            Restaurant
          </div>
        </div>

        {/* Livraison (point bleu) */}
        <div className="absolute" style={{ left: '70%', top: '60%' }}>
          <div className="bg-blue-500 text-white p-3 rounded-full shadow-lg flex items-center justify-center">
            <span className="text-sm font-bold">🏠</span>
          </div>
          <div className="bg-white px-2 py-1 rounded text-xs font-medium shadow-sm mt-1 text-center">
            Livraison
          </div>
        </div>

        {/* Position livreur (point vert) */}
        {driverPosition && (
          <div className="absolute" style={{ left: '45%', top: '45%' }}>
            <div className="bg-green-500 text-white p-3 rounded-full shadow-lg flex items-center justify-center animate-pulse">
              <span className="text-sm font-bold">🚗</span>
            </div>
            <div className="bg-white px-2 py-1 rounded text-xs font-medium shadow-sm mt-1 text-center">
              Vous
            </div>
          </div>
        )}

        {/* Ligne de trajet */}
        <svg className="absolute inset-0 w-full h-full">
          <path
            d="M 20% 30% Q 45% 45% 70% 60%"
            stroke="#3B82F6"
            strokeWidth="4"
            fill="none"
            strokeDasharray="8,4"
          />
        </svg>
      </div>

      {/* Informations */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-semibold text-gray-700">📍 Restaurant</div>
            <div className="text-gray-600 text-xs">{restaurantAddress}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-semibold text-gray-700">🏠 Livraison</div>
            <div className="text-gray-600 text-xs">{deliveryAddress}</div>
          </div>
        </div>

        {/* Position actuelle du livreur */}
        {driverPosition ? (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="font-semibold text-green-800">🚗 Votre position</div>
            <div className="text-green-700 text-sm">
              Lat: {driverPosition.lat.toFixed(6)}
            </div>
            <div className="text-green-700 text-sm">
              Lng: {driverPosition.lng.toFixed(6)}
            </div>
            <div className="text-green-600 text-xs">
              Précision: ±{driverPosition.accuracy}m
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="font-semibold text-yellow-800">⚠️ Position non détectée</div>
            <div className="text-yellow-700 text-sm">
              Cliquez sur "Localiser" pour activer le GPS
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="font-semibold text-red-800">❌ Erreur</div>
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}

        {/* Bouton de localisation */}
        <button
          onClick={startTracking}
          disabled={isTracking}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
            isTracking
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isTracking ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Localisation...
            </span>
          ) : (
            '🌍 Localiser ma position'
          )}
        </button>

        {/* Suivi en temps réel */}
        <RealtimeTracker
          restaurantCoords={restaurantCoords}
          deliveryCoords={deliveryCoords}
          onPositionUpdate={(position) => {
            console.log('📍 Position mise à jour:', position);
          }}
        />
      </div>
    </div>
  );
}

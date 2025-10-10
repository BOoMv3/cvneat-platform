'use client';

import { useState } from 'react';

export default function SafeGeolocationButton({ onPositionUpdate, className = '' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentPosition = async () => {
    console.log('🌍 SafeGeolocationButton - Demande de géolocalisation...');
    setIsLoading(true);
    setError(null);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('Géolocalisation non supportée par ce navigateur');
      }

      const position = await new Promise((resolve, reject) => {
        const options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        };

        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

      console.log('✅ SafeGeolocationButton - Position obtenue:', position.coords);
      
      const positionData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };

      if (onPositionUpdate) {
        onPositionUpdate(positionData);
      }

    } catch (error) {
      console.error('❌ SafeGeolocationButton - Erreur géolocalisation:', error);
      
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
        default:
          errorMessage = error.message || 'Erreur inconnue';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={getCurrentPosition}
        disabled={isLoading}
        className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
          isLoading 
            ? 'bg-gray-400 text-white cursor-not-allowed' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Géolocalisation...
          </span>
        ) : (
          '🌍 Ma position'
        )}
      </button>
      
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          ❌ {error}
        </div>
      )}
    </div>
  );
}
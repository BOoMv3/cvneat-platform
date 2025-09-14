'use client';

import { useState } from 'react';
import { FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';

export default function GeolocationButton({ onLocationFound, onError, className = '' }) {
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      onError?.('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationFound?.({
          latitude,
          longitude,
          accuracy: position.coords.accuracy
        });
        setLoading(false);
      },
      (error) => {
        let errorMessage = 'Erreur de géolocalisation';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permission de géolocalisation refusée';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position non disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Timeout de géolocalisation';
            break;
          default:
            errorMessage = 'Erreur inconnue';
            break;
        }
        
        onError?.(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  return (
    <button
      onClick={getCurrentLocation}
      disabled={loading}
      className={`flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <FaSpinner className="animate-spin" />
      ) : (
        <FaMapMarkerAlt />
      )}
      <span>
        {loading ? 'Localisation...' : 'Utiliser ma position'}
      </span>
    </button>
  );
}

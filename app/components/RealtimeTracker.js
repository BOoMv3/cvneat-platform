'use client';

import { useState, useEffect } from 'react';

export default function RealtimeTracker({ 
  restaurantCoords = { lat: 43.9333, lng: 3.7167 },
  deliveryCoords = { lat: 43.9334, lng: 3.7168 },
  onPositionUpdate = () => {}
}) {
  const [driverPosition, setDriverPosition] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  // Fonction pour calculer la distance entre deux points
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Fonction pour calculer le temps estimé
  const calculateEstimatedTime = (distance) => {
    const averageSpeed = 25; // km/h en ville
    return Math.round((distance / averageSpeed) * 60); // en minutes
  };

  const startRealtimeTracking = () => {
    console.log('🚀 Démarrage du suivi en temps réel...');
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

    // Obtenir la position initiale
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        setDriverPosition(pos);
        onPositionUpdate(pos);
        
        // Démarrer le suivi continu
        const id = navigator.geolocation.watchPosition(
          (position) => {
            const newPos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };
            
            console.log('📍 Position mise à jour:', newPos);
            setDriverPosition(newPos);
            onPositionUpdate(newPos);
          },
          (error) => {
            console.error('❌ Erreur suivi:', error);
            setError(`Erreur suivi: ${error.message}`);
          },
          options
        );
        
        setWatchId(id);
        setIsTracking(false);
      },
      (error) => {
        console.error('❌ Erreur position initiale:', error);
        setError(`Erreur: ${error.message}`);
        setIsTracking(false);
      },
      options
    );
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    console.log('🛑 Suivi arrêté');
  };

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Calculs en temps réel
  const distanceToDelivery = driverPosition ? 
    calculateDistance(driverPosition.lat, driverPosition.lng, deliveryCoords.lat, deliveryCoords.lng) : null;
  
  const estimatedTime = distanceToDelivery ? calculateEstimatedTime(distanceToDelivery) : null;

  return (
    <div className="space-y-4">
      {/* Statut du suivi */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="text-sm font-medium">
            {isTracking ? 'Suivi en cours...' : (driverPosition ? 'Position détectée' : 'Position non détectée')}
          </span>
        </div>
        
        <div className="flex space-x-2">
          {!isTracking && !driverPosition && (
            <button
              onClick={startRealtimeTracking}
              className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Démarrer
            </button>
          )}
          {driverPosition && (
            <button
              onClick={stopTracking}
              className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
            >
              Arrêter
            </button>
          )}
        </div>
      </div>

      {/* Position actuelle */}
      {driverPosition && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <div className="font-semibold text-green-800 text-sm">📍 Votre position</div>
          <div className="text-green-700 text-xs">
            {driverPosition.lat.toFixed(6)}, {driverPosition.lng.toFixed(6)}
          </div>
          <div className="text-green-600 text-xs">
            Précision: ±{driverPosition.accuracy}m
          </div>
        </div>
      )}

      {/* Distance et temps en temps réel */}
      {distanceToDelivery && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="font-semibold text-blue-800 text-sm">🎯 Distance restante</div>
          <div className="text-blue-700 text-lg font-bold">{distanceToDelivery.toFixed(2)} km</div>
          <div className="text-blue-600 text-sm">
            Temps estimé: {estimatedTime} minutes
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="font-semibold text-red-800 text-sm">❌ Erreur</div>
          <div className="text-red-700 text-xs">{error}</div>
        </div>
      )}
    </div>
  );
}

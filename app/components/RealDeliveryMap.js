'use client';

import { useState, useEffect, useRef } from 'react';

export default function RealDeliveryMap({ 
  restaurantAddress = "Restaurant Test, Adresse Restaurant",
  deliveryAddress = "10 place des cèdres, 34190 Ganges",
  className = '' 
}) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Coordonnées approximatives pour Ganges, France
  const defaultCenter = { lat: 43.9333, lng: 3.7167 };
  const restaurantCoords = { lat: 43.9333, lng: 3.7167 };
  const deliveryCoords = { lat: 43.9334, lng: 3.7168 };

  useEffect(() => {
    const initMap = () => {
      if (!window.google) {
        setError('Google Maps non chargé');
        setIsLoading(false);
        return;
      }

      try {
        // Créer la carte
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          zoom: 15,
          center: defaultCenter,
          mapTypeId: 'roadmap',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        setMap(mapInstance);

        // Initialiser les services
        const dirService = new window.google.maps.DirectionsService();
        const dirRenderer = new window.google.maps.DirectionsRenderer({
          draggable: false,
          suppressMarkers: false
        });

        setDirectionsService(dirService);
        setDirectionsRenderer(dirRenderer);
        dirRenderer.setMap(mapInstance);

        // Calculer l'itinéraire
        calculateRoute(dirService, dirRenderer);

      } catch (error) {
        console.error('Erreur initialisation carte:', error);
        setError('Erreur lors du chargement de la carte');
        setIsLoading(false);
      }
    };

    // Charger Google Maps si pas déjà chargé
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || 'AIzaSyBvOkBw6m5gKjKjKjKjKjKjKjKjKjKjKjKj'}&libraries=geometry`;
      script.onload = initMap;
      script.onerror = () => {
        setError('Impossible de charger Google Maps');
        setIsLoading(false);
      };
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (directionsRenderer) {
        directionsRenderer.setMap(null);
      }
    };
  }, []);

  const calculateRoute = (service, renderer) => {
    if (!service || !renderer) return;

    const request = {
      origin: restaurantCoords,
      destination: deliveryCoords,
      travelMode: window.google.maps.TravelMode.DRIVING,
      unitSystem: window.google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    };

    service.route(request, (result, status) => {
      if (status === 'OK') {
        renderer.setDirections(result);
        
        // Extraire les informations de l'itinéraire
        const route = result.routes[0];
        const leg = route.legs[0];
        
        setRouteInfo({
          distance: leg.distance.text,
          duration: leg.duration.text,
          steps: leg.steps
        });
        
        console.log('✅ Itinéraire calculé:', {
          distance: leg.distance.text,
          duration: leg.duration.text
        });
        
        setIsLoading(false);
      } else {
        console.error('Erreur calcul itinéraire:', status);
        setError('Impossible de calculer l\'itinéraire');
        setIsLoading(false);
      }
    });
  };

  const getCurrentLocation = () => {
    console.log('🌍 Localisation du livreur...');
    
    if (!navigator.geolocation) {
      alert('Géolocalisation non supportée');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setDriverPosition(pos);

        // Centrer la carte sur la position du livreur
        if (map) {
          map.setCenter(pos);
          map.setZoom(16);

          // Ajouter un marqueur pour le livreur
          new window.google.maps.Marker({
            position: pos,
            map: map,
            title: 'Votre position',
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
            }
          });
        }

        // Calculer la distance et le temps restant
        if (directionsService && pos) {
          const request = {
            origin: pos,
            destination: deliveryCoords,
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC
          };

          directionsService.route(request, (result, status) => {
            if (status === 'OK') {
              const route = result.routes[0];
              const leg = route.legs[0];
              
              alert(`📍 Votre position détectée !\n\n🎯 Distance restante: ${leg.distance.text}\n⏱️ Temps estimé: ${leg.duration.text}\n\n🗺️ La carte est maintenant centrée sur votre position.`);
            }
          });
        }

        console.log('✅ Position livreur:', pos);
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        alert('Erreur de géolocalisation: ' + error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/${restaurantCoords.lat},${restaurantCoords.lng}/${deliveryCoords.lat},${deliveryCoords.lng}`;
    window.open(url, '_blank');
  };

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <h3 className="font-semibold text-gray-900 mb-4">🗺️ Carte de livraison</h3>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-center">
          <p className="text-red-700 font-semibold">❌ Erreur de carte</p>
          <p className="text-red-600 text-sm mt-2">{error}</p>
          <button
            onClick={openInGoogleMaps}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🗺️ Ouvrir dans Google Maps
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <h3 className="font-semibold text-gray-900 mb-4">🗺️ Navigation de livraison</h3>
      
      {/* Carte Google Maps */}
      <div className="relative">
        <div 
          ref={mapRef} 
          className="w-full h-64 rounded-lg border"
          style={{ minHeight: '256px' }}
        />
        
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Chargement de la carte...</p>
            </div>
          </div>
        )}
      </div>

      {/* Informations de l'itinéraire */}
      {routeInfo && (
        <div className="mt-4 bg-gray-50 rounded p-3">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="font-semibold text-gray-700">Distance</div>
              <div className="text-blue-600 font-bold">{routeInfo.distance}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-700">Temps</div>
              <div className="text-green-600 font-bold">{routeInfo.duration}</div>
            </div>
          </div>
        </div>
      )}

      {/* Adresses */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="bg-red-50 p-3 rounded">
          <div className="font-semibold text-red-700">📍 Restaurant</div>
          <div className="text-red-600 text-xs">{restaurantAddress}</div>
        </div>
        <div className="bg-blue-50 p-3 rounded">
          <div className="font-semibold text-blue-700">🏠 Livraison</div>
          <div className="text-blue-600 text-xs">{deliveryAddress}</div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="mt-4 space-y-2">
        <button
          onClick={getCurrentLocation}
          className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-semibold"
        >
          🌍 Localiser ma position
        </button>
        
        <button
          onClick={openInGoogleMaps}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-semibold"
        >
          🗺️ Ouvrir dans Google Maps
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3">
        <p className="text-yellow-800 text-sm font-semibold">💡 Instructions :</p>
        <ul className="text-yellow-700 text-xs mt-1 space-y-1">
          <li>• Cliquez sur "Localiser ma position" pour vous géolocaliser</li>
          <li>• Utilisez "Ouvrir dans Google Maps" pour la navigation GPS</li>
          <li>• Suivez l'itinéraire affiché sur la carte</li>
        </ul>
      </div>
    </div>
  );
}

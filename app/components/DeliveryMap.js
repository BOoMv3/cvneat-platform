'use client';
import { useEffect, useRef, useState } from 'react';
import { FaMapMarkerAlt, FaTruck, FaUser } from 'react-icons/fa';

export default function DeliveryMap({ 
  restaurantAddress, 
  deliveryAddress, 
  deliveryId,
  orderId 
}) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Charger Leaflet dynamiquement
    const loadLeaflet = async () => {
      if (typeof window !== 'undefined') {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        
        if (!mapRef.current) return;

        // Initialiser la carte
        const mapInstance = L.map(mapRef.current).setView([48.8566, 2.3522], 13); // Paris par défaut

        // Ajouter la couche OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance);

        setMap(mapInstance);
        setLoading(false);

        // Géocoder les adresses
        await geocodeAddresses(L, mapInstance);
      }
    };

    loadLeaflet();
  }, []);

  const geocodeAddresses = async (L, mapInstance) => {
    try {
      // Géocoder l'adresse du restaurant
      const restaurantCoords = await geocodeAddress(restaurantAddress);
      if (restaurantCoords) {
        const restaurantMarker = L.marker(restaurantCoords, {
          icon: L.divIcon({
            className: 'custom-marker restaurant-marker',
            html: '<div class="marker-icon restaurant"><i class="fas fa-map-marker-alt"></i></div>',
            iconSize: [30, 30]
          })
        }).addTo(mapInstance);

        restaurantMarker.bindPopup(`
          <div class="marker-popup">
            <h4>🍽️ Restaurant</h4>
            <p>${restaurantAddress}</p>
          </div>
        `);

        setMarkers(prev => [...prev, { type: 'restaurant', marker: restaurantMarker, coords: restaurantCoords }]);
      }

      // Géocoder l'adresse de livraison
      const deliveryCoords = await geocodeAddress(deliveryAddress);
      if (deliveryCoords) {
        const deliveryMarker = L.marker(deliveryCoords, {
          icon: L.divIcon({
            className: 'custom-marker delivery-marker',
            html: '<div class="marker-icon delivery"><i class="fas fa-user"></i></div>',
            iconSize: [30, 30]
          })
        }).addTo(mapInstance);

        deliveryMarker.bindPopup(`
          <div class="marker-popup">
            <h4>🏠 Livraison</h4>
            <p>${deliveryAddress}</p>
          </div>
        `);

        setMarkers(prev => [...prev, { type: 'delivery', marker: deliveryMarker, coords: deliveryCoords }]);

        // Ajuster la vue pour inclure les deux points
        if (restaurantCoords) {
          const bounds = L.latLngBounds([restaurantCoords, deliveryCoords]);
          mapInstance.fitBounds(bounds, { padding: [20, 20] });
        }
      }

      // Ajouter le marqueur du livreur (position simulée)
      const driverCoords = restaurantCoords ? 
        [restaurantCoords[0] + 0.001, restaurantCoords[1] + 0.001] : 
        [48.8566, 2.3522];

      const driverMarker = L.marker(driverCoords, {
        icon: L.divIcon({
          className: 'custom-marker driver-marker',
          html: '<div class="marker-icon driver"><i class="fas fa-truck"></i></div>',
          iconSize: [30, 30]
        })
      }).addTo(mapInstance);

      driverMarker.bindPopup(`
        <div class="marker-popup">
          <h4>🚚 Livreur</h4>
          <p>En route vers la livraison</p>
        </div>
      `);

      setMarkers(prev => [...prev, { type: 'driver', marker: driverMarker, coords: driverCoords }]);

      // Dessiner le trajet
      if (restaurantCoords && deliveryCoords) {
        drawRoute(L, mapInstance, restaurantCoords, deliveryCoords);
      }

    } catch (error) {
      console.error('Erreur géocodage:', error);
    }
  };

  const geocodeAddress = async (address) => {
    try {
      // Utiliser l'API de géocodage gratuite Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      return null;
    } catch (error) {
      console.error('Erreur géocodage:', error);
      return null;
    }
  };

  const drawRoute = (L, mapInstance, start, end) => {
    // Simuler un trajet avec des points intermédiaires
    const routePoints = [
      start,
      [start[0] + (end[0] - start[0]) * 0.25, start[1] + (end[1] - start[1]) * 0.25],
      [start[0] + (end[0] - start[0]) * 0.5, start[1] + (end[1] - start[1]) * 0.5],
      [start[0] + (end[0] - start[0]) * 0.75, start[1] + (end[1] - start[1]) * 0.75],
      end
    ];

    const routeLine = L.polyline(routePoints, {
      color: '#3B82F6',
      weight: 4,
      opacity: 0.8
    }).addTo(mapInstance);

    setRoute(routeLine);
  };

  return (
    <div className="relative">
      {/* Styles pour les marqueurs */}
      <style jsx>{`
        .custom-marker {
          background: none;
          border: none;
        }
        
        .marker-icon {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .marker-icon.restaurant {
          background-color: #EF4444;
        }
        
        .marker-icon.delivery {
          background-color: #10B981;
        }
        
        .marker-icon.driver {
          background-color: #3B82F6;
        }
        
        .marker-popup {
          text-align: center;
        }
        
        .marker-popup h4 {
          margin: 0 0 5px 0;
          font-weight: 600;
        }
        
        .marker-popup p {
          margin: 0;
          font-size: 12px;
          color: #666;
        }
      `}</style>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Carte de livraison</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Restaurant</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Livraison</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Livreur</span>
            </div>
          </div>
        </div>

        <div 
          ref={mapRef} 
          className="w-full h-64 rounded-lg border"
          style={{ minHeight: '256px' }}
        >
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Chargement de la carte...</span>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">📍 Restaurant</h4>
            <p className="text-gray-600">{restaurantAddress}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">🏠 Livraison</h4>
            <p className="text-gray-600">{deliveryAddress}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 
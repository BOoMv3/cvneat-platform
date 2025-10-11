'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FaMapMarkerAlt, 
  FaMotorcycle, 
  FaStore, 
  FaPhone,
  FaClock,
  FaArrowLeft,
  FaCheckCircle
} from 'react-icons/fa';

export default function TrackOrder() {
  const { orderId } = useParams();
  const router = useRouter();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapIframeRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    // Récupérer les données initiales
    fetchTracking();

    // Polling toutes les 5 secondes pour mettre à jour la position
    const interval = setInterval(fetchTracking, 5000);

    return () => clearInterval(interval);
  }, [orderId]);

  const fetchTracking = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/tracking`);
      
      if (!response.ok) {
        throw new Error('Commande non trouvée');
      }

      const data = await response.json();
      console.log('📍 Tracking data:', data);
      setTrackingData(data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur récupération tracking:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      'en_attente': { text: 'En attente d\'acceptation', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
      'acceptee': { text: 'Acceptée par le restaurant', color: 'bg-blue-100 text-blue-800', icon: '✅' },
      'en_preparation': { text: 'En cours de préparation', color: 'bg-orange-100 text-orange-800', icon: '🍳' },
      'pret_a_livrer': { text: 'Prête à livrer', color: 'bg-purple-100 text-purple-800', icon: '📦' },
      'en_livraison': { text: 'En cours de livraison', color: 'bg-green-100 text-green-800', icon: '🏍️' },
      'livree': { text: 'Livrée', color: 'bg-green-500 text-white', icon: '✅' },
      'refusee': { text: 'Refusée', color: 'bg-red-100 text-red-800', icon: '❌' },
      'annulee': { text: 'Annulée', color: 'bg-gray-100 text-gray-800', icon: '🚫' }
    };
    return statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800', icon: '❓' };
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getMapUrl = () => {
    if (!trackingData) return null;

    const { driver, delivery, restaurant } = trackingData;
    const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    
    if (!googleMapsKey) {
      console.error('❌ NEXT_PUBLIC_GOOGLE_MAPS_KEY non configurée');
      return null;
    }
    
    // Si le livreur est en route et a une position
    if (driver?.currentPosition && delivery?.latitude && delivery?.longitude) {
      const origin = `${driver.currentPosition.latitude},${driver.currentPosition.longitude}`;
      const destination = `${delivery.latitude},${delivery.longitude}`;
      
      return `https://www.google.com/maps/embed/v1/directions?key=${googleMapsKey}&origin=${origin}&destination=${destination}&mode=driving`;
    }
    
    // Si la commande est prête mais pas encore en livraison, montrer le restaurant
    if (restaurant?.latitude && restaurant?.longitude && delivery?.latitude && delivery?.longitude) {
      const origin = `${restaurant.latitude},${restaurant.longitude}`;
      const destination = `${delivery.latitude},${delivery.longitude}`;
      
      return `https://www.google.com/maps/embed/v1/directions?key=${googleMapsKey}&origin=${origin}&destination=${destination}&mode=driving`;
    }
    
    // Sinon, montrer juste l'adresse de livraison
    if (delivery?.latitude && delivery?.longitude) {
      return `https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${delivery.latitude},${delivery.longitude}&zoom=15`;
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du suivi...</p>
        </div>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Commande non trouvée</h1>
          <p className="text-gray-600 mb-4">{error || 'Cette commande n\'existe pas'}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(trackingData.status);
  const mapUrl = getMapUrl();
  const isDelivering = trackingData.status === 'en_livraison';
  const hasDriverPosition = trackingData.driver?.currentPosition;

  // Calculer la distance restante si on a la position du livreur
  let remainingDistance = null;
  if (hasDriverPosition && trackingData.delivery?.latitude && trackingData.delivery?.longitude) {
    remainingDistance = calculateDistance(
      trackingData.driver.currentPosition.latitude,
      trackingData.driver.currentPosition.longitude,
      trackingData.delivery.latitude,
      trackingData.delivery.longitude
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <FaArrowLeft />
              <span>Retour</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Suivi de commande</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Statut de la commande */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Commande #{orderId.slice(0, 8)}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Commandée le {new Date(trackingData.createdAt).toLocaleString('fr-FR')}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full font-medium ${statusInfo.color}`}>
              {statusInfo.icon} {statusInfo.text}
            </div>
          </div>

          {/* Barre de progression */}
          <div className="relative pt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">En attente</span>
              <span className="text-xs font-medium text-gray-600">Acceptée</span>
              <span className="text-xs font-medium text-gray-600">En préparation</span>
              <span className="text-xs font-medium text-gray-600">En livraison</span>
              <span className="text-xs font-medium text-gray-600">Livrée</span>
            </div>
            <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-500"
                style={{ 
                  width: trackingData.status === 'livree' ? '100%' : 
                         trackingData.status === 'en_livraison' ? '75%' :
                         trackingData.status === 'pret_a_livrer' ? '60%' :
                         trackingData.status === 'en_preparation' ? '50%' :
                         trackingData.status === 'acceptee' ? '25%' : '10%'
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carte GPS */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600">
                <h3 className="text-lg font-bold text-white flex items-center">
                  <FaMapMarkerAlt className="mr-2" />
                  {isDelivering ? 'Suivi en temps réel' : 'Itinéraire de livraison'}
                </h3>
                {hasDriverPosition && remainingDistance && (
                  <p className="text-white text-sm mt-1">
                    Distance restante : {remainingDistance.toFixed(2)} km
                  </p>
                )}
              </div>
              
              {mapUrl ? (
                <div className="relative" style={{ height: '500px' }}>
                  <iframe
                    ref={mapIframeRef}
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  
                  {isDelivering && hasDriverPosition && (
                    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">
                          Position mise à jour {new Date(trackingData.driver.currentPosition.lastUpdate).toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <FaMapMarkerAlt className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-600">Carte non disponible pour cette commande</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informations détaillées */}
          <div className="space-y-6">
            {/* Informations du livreur */}
            {trackingData.driver && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <FaMotorcycle className="mr-2 text-orange-500" />
                  Votre livreur
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold">
                    {trackingData.driver.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{trackingData.driver.name}</p>
                    {trackingData.driver.phone && (
                      <a 
                        href={`tel:${trackingData.driver.phone}`}
                        className="flex items-center space-x-1 text-sm text-orange-600 hover:text-orange-700 mt-1"
                      >
                        <FaPhone className="h-3 w-3" />
                        <span>{trackingData.driver.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
                
                {hasDriverPosition && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-700">
                      <FaCheckCircle />
                      <span className="text-sm font-medium">Position en temps réel active</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Adresse de livraison */}
            {trackingData.delivery && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-orange-500" />
                  Adresse de livraison
                </h3>
                <p className="text-gray-700">{trackingData.delivery.address}</p>
              </div>
            )}

            {/* Restaurant */}
            {trackingData.restaurant && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <FaStore className="mr-2 text-orange-500" />
                  Restaurant
                </h3>
                <p className="font-semibold text-gray-900">{trackingData.restaurant.name}</p>
                <p className="text-sm text-gray-600 mt-1">{trackingData.restaurant.address}</p>
              </div>
            )}

            {/* Actualisation automatique */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-2 text-blue-700">
                <FaClock />
                <span className="text-sm font-medium">Actualisation automatique toutes les 5 secondes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


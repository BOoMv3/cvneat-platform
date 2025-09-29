import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { restaurantAddress, deliveryAddress, orderAmount, restaurantId, customerLocation } = body;

    if (!deliveryAddress) {
      return NextResponse.json({ 
        error: 'deliveryAddress requis' 
      }, { status: 400 });
    }

    console.log('Calcul de distance pour:', { restaurantAddress, deliveryAddress });

    // Géocoder les adresses pour obtenir les coordonnées GPS
    const restaurantCoords = await geocodeAddress(restaurantAddress || 'Ganges, France');
    const deliveryCoords = await geocodeAddress(deliveryAddress);

    if (!restaurantCoords || !deliveryCoords) {
      console.error('Erreur géocodage:', { restaurantCoords, deliveryCoords });
      return NextResponse.json({ 
        error: 'Impossible de localiser les adresses' 
      }, { status: 400 });
    }

    console.log('Coordonnées trouvées:', { restaurantCoords, deliveryCoords });
    
    // Validation des coordonnées (France métropolitaine)
    if (!isValidFrenchCoordinates(restaurantCoords) || !isValidFrenchCoordinates(deliveryCoords)) {
      console.error('Coordonnées invalides détectées:', { restaurantCoords, deliveryCoords });
      return NextResponse.json({ 
        error: 'Coordonnées géographiques invalides' 
      }, { status: 400 });
    }

    // Calculer la distance réelle avec la formule de Haversine
    const realDistance = calculateDistance(
      restaurantCoords.lat,
      restaurantCoords.lon,
      deliveryCoords.lat,
      deliveryCoords.lon
    );

    console.log(`Distance calculée: ${realDistance.toFixed(2)} km`);

    // Validation de distance raisonnable (max 100km pour éviter les erreurs de géocodage)
    if (realDistance > 100) {
      console.error('Distance aberrante détectée:', realDistance);
      return NextResponse.json({
        success: false,
        livrable: false,
        message: `Erreur de géolocalisation - Distance calculée anormale: ${realDistance.toFixed(2)}km`
      });
    }

    // Vérifier les zones spéciales de livraison
    const zoneConfig = checkSpecialDeliveryZones(deliveryAddress);
    console.log(`Zone détectée:`, zoneConfig);

    // Tarification réelle basée sur la distance calculée
    const baseFee = 2.50; // Frais de base
    const distanceFee = 0.80; // 0.80€ par km
    
    // Appliquer le multiplicateur de zone si applicable
    const adjustedDistance = realDistance * zoneConfig.multiplier;
    
    // Calculer les frais totaux
    const calculatedFee = baseFee + (adjustedDistance * distanceFee);
    // Plafonner à 10€ maximum
    const totalDeliveryFee = Math.min(calculatedFee, 10.00);
    
    // Vérifier si la livraison est possible selon la zone
    const livrable = realDistance <= zoneConfig.maxDistance;
    
    if (!livrable) {
      return NextResponse.json({
        success: false,
        livrable: false,
        message: `Livraison impossible au-delà de ${zoneConfig.maxDistance}km (distance: ${realDistance.toFixed(2)}km)`
      });
    }

    // Calculer le temps de livraison estimé basé sur la distance réelle
    const preparationTime = 15; // minutes
    const averageSpeed = 25; // km/h (amélioré)
    const travelTime = (realDistance / averageSpeed) * 60; // en minutes
    const estimatedDeliveryTime = Math.round(preparationTime + travelTime);

    return NextResponse.json({
      success: true,
      livrable: true,
      frais_livraison: Math.round(totalDeliveryFee * 100) / 100, // Arrondir à 2 décimales
      distance: Math.round(realDistance * 100) / 100, // Distance réelle en km
      temps_estime: estimatedDeliveryTime, // Temps en minutes
      frais_base: baseFee,
      frais_distance: distanceFee,
      message: `Livraison possible - ${estimatedDeliveryTime}min`,
      details: {
        distance_calculée: realDistance.toFixed(2),
        distance_ajustée: adjustedDistance.toFixed(2),
        frais_calculés: calculatedFee.toFixed(2),
        plafond_appliqué: calculatedFee > 10.00,
        zone_multiplier: zoneConfig.multiplier,
        max_distance_zone: zoneConfig.maxDistance
      }
    });

  } catch (error) {
    console.error('Erreur calcul livraison:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Fonction de validation des coordonnées françaises
function isValidFrenchCoordinates(coords) {
  // France métropolitaine approximative
  const minLat = 41.0;
  const maxLat = 51.5;
  const minLon = -5.5;
  const maxLon = 9.5;
  
  return coords && 
         coords.lat >= minLat && coords.lat <= maxLat &&
         coords.lon >= minLon && coords.lon <= maxLon;
}

// Fonction de géocodage avec Nominatim (OpenStreetMap)
async function geocodeAddress(address) {
  try {
    console.log(`Géocodage de: ${address}`);
    
    // Encoder l'adresse pour l'URL
    const encodedAddress = encodeURIComponent(address + ', France');
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CVNeat-Delivery-Calculator/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur géocodage: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
      console.log(`Coordonnées trouvées: ${result.lat}, ${result.lon}`);
      return result;
    }
    
    // Fallback pour Ganges si l'API ne trouve rien
    if (address.toLowerCase().includes('ganges')) {
      console.log('Utilisation des coordonnées de fallback pour Ganges');
      return {
        lat: 43.9333,
        lon: 3.7167,
        display_name: 'Ganges, France (fallback)'
      };
    }
    
    // Fallback spécifique pour "10 place des cèdres, 34190 Ganges"
    if (address.toLowerCase().includes('place des cèdres') && address.toLowerCase().includes('ganges')) {
      console.log('Utilisation des coordonnées de fallback pour Place des Cèdres, Ganges');
      return {
        lat: 43.9333,
        lon: 3.7167,
        display_name: 'Place des Cèdres, Ganges, France (fallback)'
      };
    }
    
    console.warn(`Aucune coordonnée trouvée pour: ${address}`);
    return null;
    
  } catch (error) {
    console.error('Erreur géocodage:', error);
    return null;
  }
}

// Fonction de calcul de distance (formule de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Fonction de vérification des zones de livraison spéciales
function checkSpecialDeliveryZones(deliveryAddress) {
  const specialZones = {
    'ganges': { multiplier: 1.0, maxDistance: 2 },
    'sumène': { multiplier: 1.2, maxDistance: 5 },
    'saint-bauzille': { multiplier: 1.5, maxDistance: 8 },
    'laroque': { multiplier: 1.3, maxDistance: 6 },
    'cazilhac': { multiplier: 1.1, maxDistance: 3 }
  };
  
  const address = deliveryAddress.toLowerCase();
  for (const [zone, config] of Object.entries(specialZones)) {
    if (address.includes(zone)) {
      return config;
    }
  }
  
  return { multiplier: 1.0, maxDistance: 15 };
} 
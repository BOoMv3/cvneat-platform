import { NextResponse } from 'next/server';

// Coordonnées du restaurant (Ganges)
const RESTAURANT_COORDS = {
  lat: 43.9342,
  lng: 3.7098,
  name: 'Restaurant Ganges'
};

// Rayon maximum de livraison (en km)
const MAX_DELIVERY_RADIUS = 10;

// Prix de base et par km
const BASE_FEE = 2.50;
const FEE_PER_KM = 0.80;
const MAX_DELIVERY_FEE = 10.00;

/**
 * Calculer la distance entre deux points (formule de Haversine)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Obtenir les coordonnées d'une adresse via Nominatim
 */
async function getCoordinatesFromAddress(address) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr`
    );
    
    if (!response.ok) {
      throw new Error('Erreur API Nominatim');
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('Adresse non trouvée');
    }
    
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name
    };
  } catch (error) {
    console.error('Erreur géocodage:', error);
    throw error;
  }
}

/**
 * Calculer les frais de livraison
 */
function calculateDeliveryFee(distance) {
  const fee = BASE_FEE + (distance * FEE_PER_KM);
  return Math.min(fee, MAX_DELIVERY_FEE);
}

export async function POST(request) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json(
        { error: 'Adresse requise' },
        { status: 400 }
      );
    }

    console.log('🔍 Vérification zone de livraison pour:', address);

    // 1. Géocoder l'adresse de livraison
    const deliveryCoords = await getCoordinatesFromAddress(address);
    console.log('📍 Coordonnées livraison:', deliveryCoords);

    // 2. Calculer la distance
    const distance = calculateDistance(
      RESTAURANT_COORDS.lat,
      RESTAURANT_COORDS.lng,
      deliveryCoords.lat,
      deliveryCoords.lng
    );
    
    console.log(`📏 Distance calculée: ${distance.toFixed(2)}km`);

    // 3. Vérifier si dans le périmètre
    const isInDeliveryZone = distance <= MAX_DELIVERY_RADIUS;
    
    if (!isInDeliveryZone) {
      console.log(`❌ Hors zone: ${distance.toFixed(2)}km > ${MAX_DELIVERY_RADIUS}km`);
      return NextResponse.json({
        success: false,
        livrable: false,
        distance: distance,
        maxRadius: MAX_DELIVERY_RADIUS,
        message: `Livraison impossible : ${distance.toFixed(1)}km > ${MAX_DELIVERY_RADIUS}km maximum`
      });
    }

    // 4. Calculer les frais
    const deliveryFee = calculateDeliveryFee(distance);
    
    console.log(`💰 Frais calculés: ${deliveryFee.toFixed(2)}€`);

    return NextResponse.json({
      success: true,
      livrable: true,
      distance: distance,
      frais_livraison: deliveryFee,
      restaurant: RESTAURANT_COORDS,
      delivery_address: {
        coordinates: deliveryCoords,
        address: address
      },
      message: `Livraison possible (${distance.toFixed(1)}km) - Frais: ${deliveryFee.toFixed(2)}€`
    });

  } catch (error) {
    console.error('❌ Erreur vérification zone:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Erreur lors de la vérification de la zone de livraison'
    }, { status: 500 });
  }
}

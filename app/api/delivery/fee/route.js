import { NextResponse } from 'next/server';

// Restaurant Ganges
const RESTAURANT = {
  lat: 43.9342,
  lng: 3.7098,
  name: 'Ganges'
};

// Configuration
const BASE_FEE = 2.50;
const FEE_PER_KM = 0.80;
const MAX_FEE = 10.00;
const MAX_DISTANCE = 10; // km

// VILLES AUTORISÉES (pour vérifier si on livre dans cette zone)
const AUTHORIZED_CITIES = [
  'ganges', 'laroque', 'saint-bauzille', 'sumene', 'pegairolles', 'montoulieu',
  'saint-bauzille-de-putois', 'pegairolles-de-bueges', 'sumene', 'montoulieu'
];

// Codes postaux autorisés
const AUTHORIZED_POSTAL_CODES = ['34190', '34150', '34260'];

// Calcul distance (Haversine)
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Vérifier si l'adresse est dans une ville autorisée
function isAuthorizedCity(address) {
  const lowerAddress = address.toLowerCase();
  
  // Vérifier par code postal
  for (const postalCode of AUTHORIZED_POSTAL_CODES) {
    if (address.includes(postalCode)) {
      return true;
    }
  }
  
  // Vérifier par nom de ville
  for (const city of AUTHORIZED_CITIES) {
    if (lowerAddress.includes(city)) {
      return true;
    }
  }
  
  return false;
}

// Géocoder l'adresse avec Nominatim (VRAIE géolocalisation)
async function geocodeAddress(address) {
  try {
    console.log('🌐 Géocodage de:', address);
    
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr&addressdetails=1`
    );
    
    if (!response.ok) {
      throw new Error('Erreur API Nominatim');
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('Adresse non trouvée');
    }
    
    const result = data[0];
    console.log('📍 Géocodage réussi:', result.display_name);
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      display_name: result.display_name
    };
    
  } catch (error) {
    console.error('❌ Erreur géocodage:', error);
    throw error;
  }
}

// Calculer les frais
function calculateFee(distance) {
  const fee = BASE_FEE + (distance * FEE_PER_KM);
  return Math.min(fee, MAX_FEE);
}

export async function POST(request) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json({ error: 'Adresse requise' }, { status: 400 });
    }

    console.log('🚚 === CALCUL FRAIS 4.0 (VRAIE GÉOLOCALISATION) ===');
    console.log('Adresse:', address);

    // 1. Vérifier si c'est dans une zone autorisée
    if (!isAuthorizedCity(address)) {
      console.log('❌ Zone non autorisée:', address);
      return NextResponse.json({
        success: false,
        message: 'Livraison non disponible dans cette zone',
        livrable: false
      });
    }

    // 2. Géocoder l'adresse EXACTE du client
    const clientCoords = await geocodeAddress(address);
    console.log('📍 Coordonnées client:', clientCoords);

    // 3. Calculer la distance EXACTE entre restaurant et adresse client
    const distance = getDistance(
      RESTAURANT.lat, RESTAURANT.lng,
      clientCoords.lat, clientCoords.lng
    );

    console.log(`📏 Distance EXACTE: ${distance.toFixed(2)}km`);

    // 4. Vérifier la distance max
    if (distance > MAX_DISTANCE) {
      console.log(`❌ Trop loin: ${distance.toFixed(2)}km > ${MAX_DISTANCE}km`);
      return NextResponse.json({
        success: false,
        message: `Livraison impossible: ${distance.toFixed(1)}km (max ${MAX_DISTANCE}km)`,
        livrable: false,
        distance: distance
      });
    }

    // 5. Calculer les frais selon la VRAIE distance
    const fee = calculateFee(distance);

    console.log(`💰 Frais EXACTS: 2.50€ + (${distance.toFixed(2)}km × 0.80€) = ${fee.toFixed(2)}€`);

    return NextResponse.json({
      success: true,
      livrable: true,
      distance: distance,
      fee: fee,
      address: clientCoords.display_name,
      message: `Livraison possible: ${fee.toFixed(2)}€ (${distance.toFixed(1)}km)`
    });

  } catch (error) {
    console.error('❌ Erreur calcul frais:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

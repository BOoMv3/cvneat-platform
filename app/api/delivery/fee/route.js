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

// Villes connues avec coordonnées exactes
const CITIES = {
  'ganges': { lat: 43.9342, lng: 3.7098, name: 'Ganges' },
  'laroque': { lat: 43.9188, lng: 3.7146, name: 'Laroque' },
  'saint-bauzille': { lat: 43.9033, lng: 3.7067, name: 'Saint-Bauzille' },
  'sumene': { lat: 43.8994, lng: 3.7194, name: 'Sumène' },
  'pegairolles': { lat: 43.9178, lng: 3.7428, name: 'Pégairolles' },
  'montoulieu': { lat: 43.9200, lng: 3.6800, name: 'Montoulieu' }
};

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

// Trouver la ville dans l'adresse
function findCityInAddress(address) {
  const lowerAddress = address.toLowerCase();
  
  for (const [key, city] of Object.entries(CITIES)) {
    if (lowerAddress.includes(key) || lowerAddress.includes(city.name.toLowerCase())) {
      return city;
    }
  }
  
  return null;
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

    console.log('🚚 Calcul frais pour:', address);

    // 1. Trouver la ville dans l'adresse
    const city = findCityInAddress(address);
    
    if (!city) {
      console.log('❌ Ville non reconnue:', address);
      return NextResponse.json({
        success: false,
        message: 'Ville non reconnue dans notre zone de livraison',
        livrable: false
      });
    }

    // 2. Calculer la distance
    const distance = getDistance(
      RESTAURANT.lat, RESTAURANT.lng,
      city.lat, city.lng
    );

    console.log(`📍 ${city.name}: ${distance.toFixed(2)}km`);

    // 3. Vérifier la distance max
    if (distance > MAX_DISTANCE) {
      console.log(`❌ Trop loin: ${distance.toFixed(2)}km > ${MAX_DISTANCE}km`);
      return NextResponse.json({
        success: false,
        message: `Livraison impossible: ${city.name} est à ${distance.toFixed(1)}km (max ${MAX_DISTANCE}km)`,
        livrable: false,
        distance: distance
      });
    }

    // 4. Calculer les frais
    const fee = calculateFee(distance);

    console.log(`✅ Frais calculés: ${fee.toFixed(2)}€`);

    return NextResponse.json({
      success: true,
      livrable: true,
      distance: distance,
      fee: fee,
      city: city.name,
      message: `Livraison possible: ${fee.toFixed(2)}€`
    });

  } catch (error) {
    console.error('❌ Erreur calcul frais:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

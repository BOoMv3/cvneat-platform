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

// BASE DE DONNÉES DES ADRESSES PRÉCISES
const ADDRESS_DATABASE = {
  // Ganges - Coordonnées précises selon la zone
  'ganges-centre': { lat: 43.9342, lng: 3.7098, name: 'Centre Ganges' },
  'ganges-nord': { lat: 43.9450, lng: 3.7100, name: 'Nord Ganges' },
  'ganges-sud': { lat: 43.9250, lng: 3.7080, name: 'Sud Ganges' },
  'ganges-est': { lat: 43.9350, lng: 3.7200, name: 'Est Ganges' },
  'ganges-ouest': { lat: 43.9340, lng: 3.7000, name: 'Ouest Ganges' },
  
  // Laroque
  'laroque': { lat: 43.9188, lng: 3.7146, name: 'Laroque' },
  
  // Saint-Bauzille
  'saint-bauzille': { lat: 43.9033, lng: 3.7067, name: 'Saint-Bauzille' },
  
  // Sumène
  'sumene': { lat: 43.8994, lng: 3.7194, name: 'Sumène' },
  
  // Pégairolles
  'pegairolles': { lat: 43.9178, lng: 3.7428, name: 'Pégairolles' }
};

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

// Vérifier si l'adresse est dans une zone autorisée
function isAuthorizedCity(address) {
  // Vérifier par code postal
  for (const postalCode of AUTHORIZED_POSTAL_CODES) {
    if (address.includes(postalCode)) {
      return true;
    }
  }
  return false;
}

// Trouver la zone la plus proche dans notre base de données
function findClosestZone(address) {
  const lowerAddress = address.toLowerCase();
  
  // Si c'est Ganges, déterminer la zone selon la rue
  if (address.includes('34190') || lowerAddress.includes('ganges')) {
    if (lowerAddress.includes('olivette') || lowerAddress.includes('centre') || lowerAddress.includes('place')) {
      return ADDRESS_DATABASE['ganges-centre'];
    } else if (lowerAddress.includes('nord') || lowerAddress.includes('haut')) {
      return ADDRESS_DATABASE['ganges-nord'];
    } else if (lowerAddress.includes('sud') || lowerAddress.includes('bas')) {
      return ADDRESS_DATABASE['ganges-sud'];
    } else if (lowerAddress.includes('est')) {
      return ADDRESS_DATABASE['ganges-est'];
    } else if (lowerAddress.includes('ouest')) {
      return ADDRESS_DATABASE['ganges-ouest'];
    } else {
      // Par défaut, centre de Ganges
      return ADDRESS_DATABASE['ganges-centre'];
    }
  }
  
  // Autres villes
  if (lowerAddress.includes('laroque')) {
    return ADDRESS_DATABASE['laroque'];
  }
  if (lowerAddress.includes('saint-bauzille')) {
    return ADDRESS_DATABASE['saint-bauzille'];
  }
  if (lowerAddress.includes('sumene')) {
    return ADDRESS_DATABASE['sumene'];
  }
  if (lowerAddress.includes('pegairolles')) {
    return ADDRESS_DATABASE['pegairolles'];
  }
  
  return null;
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

    // 2. Essayer de trouver dans notre base de données locale (RAPIDE)
    let clientCoords = findClosestZone(address);
    
    if (clientCoords) {
      console.log(`📍 Trouvé dans base locale: ${clientCoords.name}`);
    } else {
      // 3. Fallback: Géocoder avec Nominatim (LENT)
      console.log('⚠️ Pas trouvé localement, tentative Nominatim...');
      try {
        clientCoords = await geocodeAddress(address);
      } catch (error) {
        console.error('❌ Nominatim échoué:', error.message);
        return NextResponse.json({
          success: false,
          message: 'Impossible de localiser cette adresse',
          livrable: false
        });
      }
    }

    // 4. Calculer la distance EXACTE
    const distance = getDistance(
      RESTAURANT.lat, RESTAURANT.lng,
      clientCoords.lat, clientCoords.lng
    );

    console.log(`📏 Distance: ${distance.toFixed(2)}km`);

    // 5. Vérifier la distance max
    if (distance > MAX_DISTANCE) {
      console.log(`❌ Trop loin: ${distance.toFixed(2)}km > ${MAX_DISTANCE}km`);
      return NextResponse.json({
        success: false,
        message: `Livraison impossible: ${distance.toFixed(1)}km (max ${MAX_DISTANCE}km)`,
        livrable: false,
        distance: distance
      });
    }

    // 6. Calculer les frais: 2.50€ + (distance × 0.80€)
    const fee = calculateFee(distance);

    console.log(`💰 Frais: 2.50€ + (${distance.toFixed(2)}km × 0.80€) = ${fee.toFixed(2)}€`);

    return NextResponse.json({
      success: true,
      livrable: true,
      distance: distance,
      fee: fee,
      zone: clientCoords.name,
      message: `Livraison: ${fee.toFixed(2)}€ (${distance.toFixed(1)}km)`
    });

  } catch (error) {
    console.error('❌ Erreur calcul frais:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

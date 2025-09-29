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
 * Base de données des coordonnées des villes principales
 */
const CITY_COORDINATES = {
  // Ganges et environs (Hérault)
  'ganges': { lat: 43.9342, lng: 3.7098, name: 'Ganges' },
  'laroque': { lat: 43.9188, lng: 3.7146, name: 'Laroque' },
  'pegairolles': { lat: 43.9178, lng: 3.7428, name: 'Pégairolles-de-Buèges' },
  'saint-bauzille': { lat: 43.9033, lng: 3.7067, name: 'Saint-Bauzille-de-Putois' },
  'sumene': { lat: 43.8994, lng: 3.7194, name: 'Sumène' },
  'montoulieu': { lat: 43.9200, lng: 3.6800, name: 'Montoulieu' },
  'moules': { lat: 43.9400, lng: 3.7200, name: 'Moulès-et-Baucels' },
  
  // Villes trop loin (pour refus)
  'saint-esteve': { lat: 43.8581, lng: 3.8331, name: 'Saint-Esteve', too_far: true },
  'perpignan': { lat: 43.8700, lng: 3.8400, name: 'Perpignan', too_far: true },
  'canet': { lat: 43.8500, lng: 3.8200, name: 'Canet-en-Roussillon', too_far: true },
};

/**
 * Obtenir les coordonnées d'une adresse (avec fallback)
 */
async function getCoordinatesFromAddress(address) {
  console.log('🔍 Recherche coordonnées pour:', address);
  
  // 1. Essayer de trouver dans notre base de données
  const normalizedAddress = address.toLowerCase();
  console.log('🔍 Recherche dans base pour:', normalizedAddress);
  
  for (const [cityKey, coords] of Object.entries(CITY_COORDINATES)) {
    // Recherche plus flexible : ville, code postal, ou partie du nom
    if (normalizedAddress.includes(cityKey) || 
        normalizedAddress.includes(coords.name.toLowerCase()) ||
        address.includes('34190') && cityKey === 'ganges' ||
        address.includes('34150') && cityKey === 'laroque' ||
        address.includes('34260') && (cityKey === 'pegairolles' || cityKey === 'sumene')) {
      console.log(`📍 Trouvé dans base: ${coords.name} (clé: ${cityKey})`);
      return {
        lat: coords.lat,
        lng: coords.lng,
        display_name: `${coords.name}, France`,
        too_far: coords.too_far || false
      };
    }
  }
  
  console.log('❌ Aucune correspondance trouvée dans la base locale');
  
  // 2. Fallback avec API Nominatim (TEMPORAIREMENT DÉSACTIVÉ)
  console.log('⚠️ Nominatim temporairement désactivé pour éviter les erreurs');
  
  // Sauter directement au fallback par code postal
  try {
    
    // 3. Fallback final : estimer selon le code postal
    const postalMatch = address.match(/(\d{5})/);
    if (postalMatch) {
      const postalCode = postalMatch[1];
      console.log(`📮 Estimation par code postal: ${postalCode}`);
      
      if (postalCode === '34190') { // Ganges
        return { lat: 43.9342, lng: 3.7098, display_name: 'Ganges, 34190, France' };
      } else if (postalCode === '34150') { // Laroque
        return { lat: 43.9188, lng: 3.7146, display_name: 'Laroque, 34150, France' };
      } else if (postalCode === '34260') { // Pégairolles/Sumène
        return { lat: 43.9086, lng: 3.7311, display_name: 'Zone 34260, France' };
      } else {
        // Code postal inconnu = probablement trop loin
        throw new Error(`Code postal ${postalCode} non reconnu dans la zone de livraison`);
      }
    }
    
    throw new Error('Impossible de localiser cette adresse');
  } catch (error) {
    console.error('❌ Erreur fallback:', error.message);
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

    // 2. Vérifier si c'est marqué comme trop loin dans notre base
    if (deliveryCoords.too_far) {
      console.log(`❌ Ville trop loin (marquée dans base): ${deliveryCoords.display_name}`);
      return NextResponse.json({
        success: false,
        livrable: false,
        distance: 999, // Distance fictive très grande
        maxRadius: MAX_DELIVERY_RADIUS,
        message: `Livraison impossible : ${deliveryCoords.name} est trop loin de Ganges. Zone de livraison limitée à ${MAX_DELIVERY_RADIUS}km.`
      });
    }

    // 3. Calculer la distance
    const distance = calculateDistance(
      RESTAURANT_COORDS.lat,
      RESTAURANT_COORDS.lng,
      deliveryCoords.lat,
      deliveryCoords.lng
    );
    
    console.log(`📏 Distance calculée: ${distance.toFixed(2)}km`);

    // 4. Vérifier si dans le périmètre
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

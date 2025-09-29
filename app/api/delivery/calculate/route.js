import { NextResponse } from 'next/server';

// Restaurant Ganges - COORDONNÉES FIXES
const RESTAURANT = {
  lat: 43.9342,
  lng: 3.7098,
  name: 'Restaurant Ganges'
};

// Configuration des frais
const BASE_FEE = 2.50;        // 2.50€ de base
const FEE_PER_KM = 0.80;      // 0.80€ par kilomètre
const MAX_FEE = 10.00;        // Maximum 10€
const MAX_DISTANCE = 10;      // Maximum 10km

// Codes postaux autorisés
const AUTHORIZED_POSTAL_CODES = ['34190', '34150', '34260'];

/**
 * Calculer la distance entre deux points (Haversine)
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
 * Géocoder une adresse avec Nominatim
 */
async function geocodeAddress(address) {
  try {
    console.log('🌐 Géocodage:', address);
    
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr`;
    
    console.log('🌐 URL Nominatim:', url);
    
    // Timeout de 10 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CVNeat-Delivery/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('🌐 Réponse Nominatim:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Erreur Nominatim HTTP: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('🌐 Données Nominatim:', data);
    
    if (!data || data.length === 0) {
      throw new Error('Adresse non trouvée dans Nominatim');
    }
    
    const result = data[0];
    const coords = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      display_name: result.display_name
    };
    
    console.log('🌐 Coordonnées extraites:', coords);
    return coords;
    
  } catch (error) {
    console.error('❌ Erreur géocodage détaillée:', error);
    if (error.name === 'AbortError') {
      throw new Error('Timeout lors du géocodage');
    }
    throw error;
  }
}

/**
 * Calculer les frais de livraison
 */
function calculateDeliveryFee(distance) {
  const fee = BASE_FEE + (distance * FEE_PER_KM);
  return Math.min(fee, MAX_FEE);
}

export async function POST(request) {
  try {
    console.log('🚚 === API DELIVERY CALCULATE START ===');
    
    // Parser le body avec gestion d'erreur
    let body;
    try {
      body = await request.json();
      console.log('📦 Body reçu:', body);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      return NextResponse.json({ 
        success: false, 
        error: 'Données invalides',
        message: 'Format de données incorrect'
      }, { status: 400 });
    }
    
    const { address } = body;
    
    if (!address) {
      console.log('❌ Adresse manquante');
      return NextResponse.json({ 
        success: false, 
        error: 'Adresse requise',
        message: 'Adresse de livraison requise'
      }, { status: 400 });
    }

    console.log('🚚 === CALCUL LIVRAISON 5.0 ===');
    console.log('Adresse:', address);

    // 1. Vérifier le code postal
    const hasValidPostalCode = AUTHORIZED_POSTAL_CODES.some(code => address.includes(code));
    
    if (!hasValidPostalCode) {
      console.log('❌ Code postal non autorisé');
      return NextResponse.json({
        success: false,
        livrable: false,
        message: 'Livraison non disponible dans cette zone'
      });
    }

    // 2. Géocoder l'adresse du client
    console.log('🌐 Début géocodage...');
    const clientCoords = await geocodeAddress(address);
    console.log('📍 Coordonnées client:', clientCoords);

    // 3. Calculer la distance entre restaurant et client
    const distance = calculateDistance(
      RESTAURANT.lat, RESTAURANT.lng,
      clientCoords.lat, clientCoords.lng
    );

    console.log(`📏 Distance: ${distance.toFixed(2)}km`);

    // 4. Vérifier la distance maximum
    if (distance > MAX_DISTANCE) {
      console.log(`❌ Trop loin: ${distance.toFixed(2)}km > ${MAX_DISTANCE}km`);
      return NextResponse.json({
        success: false,
        livrable: false,
        distance: distance,
        message: `Livraison impossible: ${distance.toFixed(1)}km (maximum ${MAX_DISTANCE}km)`
      });
    }

    // 5. Calculer les frais: 2.50€ + (distance × 0.80€)
    const deliveryFee = calculateDeliveryFee(distance);

    console.log(`💰 Frais: ${BASE_FEE}€ + (${distance.toFixed(2)}km × ${FEE_PER_KM}€) = ${deliveryFee.toFixed(2)}€`);

    return NextResponse.json({
      success: true,
      livrable: true,
      distance: distance,
      frais_livraison: deliveryFee,
      restaurant: RESTAURANT.name,
      client_address: clientCoords.display_name,
      message: `Livraison possible: ${deliveryFee.toFixed(2)}€ (${distance.toFixed(1)}km)`
    });

  } catch (error) {
    console.error('❌ ERREUR API DELIVERY CALCULATE:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Erreur lors du calcul des frais de livraison',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

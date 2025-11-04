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

// Base de données simple pour éviter Nominatim
const COORDINATES_DB = {
  // Ganges avec zones différentes pour tester les distances
  'ganges-centre': { lat: 43.9342, lng: 3.7098, name: 'Centre Ganges' },
  'ganges-nord': { lat: 43.9450, lng: 3.7100, name: 'Nord Ganges' },
  'ganges-sud': { lat: 43.9250, lng: 3.7080, name: 'Sud Ganges' },
  'ganges-est': { lat: 43.9350, lng: 3.7200, name: 'Est Ganges' },
  'ganges-ouest': { lat: 43.9340, lng: 3.7000, name: 'Ouest Ganges' },
  
  // Autres villes
  'laroque': { lat: 43.9188, lng: 3.7146, name: 'Laroque' },
  'saint-bauzille': { lat: 43.9033, lng: 3.7067, name: 'Saint-Bauzille' },
  'sumene': { lat: 43.8994, lng: 3.7194, name: 'Sumène' },
  'pegairolles': { lat: 43.9178, lng: 3.7428, name: 'Pégairolles' }
};

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
      console.log('❌ Code postal non autorisé dans:', address);
      return NextResponse.json({
        success: false,
        livrable: false,
        message: '❌ Livraison non disponible dans cette zone. Nous desservons actuellement les zones autour de Ganges.'
      }, { status: 200 }); // Status 200 pour que le frontend puisse parser la réponse
    }

    // 2. Géocoder TOUJOURS avec Nominatim pour avoir les VRAIES coordonnées
    console.log('🌐 Géocodage Nominatim pour adresse EXACTE...');
    let clientCoords;
    try {
      clientCoords = await geocodeAddress(address);
      console.log('📍 Coordonnées EXACTES:', clientCoords);
    } catch (error) {
      console.error('❌ Nominatim échoué:', error.message);
      return NextResponse.json({
        success: false,
        livrable: false,
        message: `❌ Impossible de localiser cette adresse. Vérifiez que l'adresse est correcte. (${error.message})`
      }, { status: 200 }); // Status 200 pour que le frontend puisse parser la réponse
    }

    // 3. Calculer la distance entre restaurant et client
    const distance = calculateDistance(
      RESTAURANT.lat, RESTAURANT.lng,
      clientCoords.lat, clientCoords.lng
    );

    console.log(`📏 Distance: ${distance.toFixed(2)}km`);

    // 4. Vérifier la distance maximum
    if (distance > MAX_DISTANCE) {
      console.log(`❌ REJET: Trop loin: ${distance.toFixed(2)}km > ${MAX_DISTANCE}km`);
      return NextResponse.json({
        success: false,
        livrable: false,
        distance: parseFloat(distance.toFixed(2)),
        max_distance: MAX_DISTANCE,
        message: `❌ Livraison impossible: ${distance.toFixed(1)}km (maximum ${MAX_DISTANCE}km)`
      }, { status: 200 }); // Status 200 pour que le frontend puisse parser la réponse
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

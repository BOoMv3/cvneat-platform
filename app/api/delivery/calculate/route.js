import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// Configuration par défaut (utilisée si aucune donnée spécifique restaurant)
const DEFAULT_RESTAURANT = {
  lat: 43.9342,
  lng: 3.7098,
  name: 'Restaurant Ganges'
};

const DEFAULT_BASE_FEE = 2.50;      // 2.50€ de base
const DEFAULT_PER_KM_FEE = 0.80;    // 0.80€ par kilomètre (tarif standard)
const ALTERNATE_PER_KM_FEE = 0.89;  // 0.89€ par kilomètre (tarif premium éventuel)
const MAX_FEE = 10.00;              // Maximum 10€
const MAX_DISTANCE = 10;            // Maximum 10km

// Codes postaux autorisés
const AUTHORIZED_POSTAL_CODES = ['34190', '34150', '34260'];

// Cache pour les coordonnées géocodées (en mémoire, pour éviter les variations)
// En production, utiliser une table Supabase pour un cache persistant
const coordinatesCache = new Map();
const restaurantCache = new Map();

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

function normalizeAddressForCache(address) {
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s\d]/g, '')
    .replace(/\bfrance\b/gi, '')
    .trim();
}

function buildCacheKey(address, prefix = 'addr') {
  const normalizedAddress = normalizeAddressForCache(address);
  const postalCodeMatch = address.match(/\b(\d{5})\b/);
  const postalCode = postalCodeMatch ? postalCodeMatch[1] : '';
  return `${prefix}_${postalCode}_${normalizedAddress}`;
}

async function getCoordinatesWithCache(address, { prefix = 'addr' } = {}) {
  const cacheKey = buildCacheKey(address, prefix);
  const cache = prefix === 'restaurant' ? restaurantCache : coordinatesCache;

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    console.log(`📍 Coordonnées depuis le cache (${prefix}):`, cached);
    return cached;
  }

  const coords = await geocodeAddress(address);
  console.log(`📍 Coordonnées EXACTES depuis Nominatim (${prefix}):`, coords);

  coords.lat = Math.round(coords.lat * 100) / 100;
  coords.lng = Math.round(coords.lng * 100) / 100;

  if (cache.size > 1000) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }

  cache.set(cacheKey, coords);
  console.log(`💾 Coordonnées mises en cache (${prefix}) (arrondies à 2 décimales pour stabilité)`);

  return coords;
}

function pickNumeric(candidates = [], fallback, { min } = {}) {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue;
    const parsed = typeof candidate === 'number' ? candidate : parseFloat(candidate);
    if (!Number.isNaN(parsed) && (min === undefined || parsed >= min)) {
      return parsed;
    }
  }
  return fallback;
}

/**
 * Calculer les frais de livraison
 * IMPORTANT: Arrondir à 2 décimales pour éviter les micro-variations
 */
function calculateDeliveryFee(distance, {
  baseFee = DEFAULT_BASE_FEE,
  perKmFee = DEFAULT_PER_KM_FEE
} = {}) {
  const fee = baseFee + (distance * perKmFee);
  const cappedFee = Math.min(fee, MAX_FEE);
  // Arrondir à 2 décimales pour garantir la cohérence
  return Math.round(cappedFee * 100) / 100;
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
    
    const {
      address,
      deliveryAddress,
      restaurantAddress: restaurantAddressOverride,
      restaurantId,
      orderAmount,
      perKmRate,
      baseFee: baseFeeOverride,
      freeDeliveryThreshold
    } = body;
    
    const clientAddress = deliveryAddress || address;
    
    if (!clientAddress) {
      console.log('❌ Adresse manquante');
      return NextResponse.json({ 
        success: false, 
        error: 'Adresse requise',
        message: 'Adresse de livraison requise'
      }, { status: 400 });
    }

    console.log('🚚 === CALCUL LIVRAISON 5.0 ===');
    console.log('Adresse client:', clientAddress);

    // 1. Vérifier le code postal
    const hasValidPostalCode = AUTHORIZED_POSTAL_CODES.some(code => clientAddress.includes(code));
    
    if (!hasValidPostalCode) {
      console.log('❌ Code postal non autorisé dans:', clientAddress);
      return NextResponse.json({
        success: false,
        livrable: false,
        message: '❌ Livraison non disponible dans cette zone. Nous desservons actuellement les zones autour de Ganges.'
      }, { status: 200 }); // Status 200 pour que le frontend puisse parser la réponse
    }

    // 2. Récupérer les informations du restaurant si disponibles
    let restaurantData = null;
    if (restaurantId) {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .single();

        if (error) {
          console.warn('⚠️ Impossible de récupérer le restaurant', restaurantId, error);
        } else if (data) {
          restaurantData = data;
        }
      } catch (error) {
        console.warn('⚠️ Erreur inattendue lors de la récupération du restaurant', restaurantId, error);
      }
    }

    // Déterminer l'adresse du restaurant à utiliser pour le calcul si elle n'est pas déjà fournie
    const restaurantAddressCandidates = [
      restaurantAddressOverride,
      restaurantData ? [
        restaurantData.adresse,
        restaurantData.code_postal,
        restaurantData.ville
      ].filter(Boolean).join(', ').trim() : null
    ].filter(addr => typeof addr === 'string' && addr.trim().length > 0);

    const restaurantAddress = restaurantAddressCandidates[0] || null;
    const restaurantName = restaurantData?.nom || DEFAULT_RESTAURANT.name;

    // 3. Géocoder avec cache pour éviter les variations
    console.log('🌐 Géocodage avec cache pour les adresses...');
    let clientCoords;
    let restaurantCoords;

    try {
      clientCoords = await getCoordinatesWithCache(clientAddress, { prefix: 'client' });
    } catch (error) {
      console.error('❌ Nominatim échoué pour l\'adresse client:', error.message);
      return NextResponse.json({
        success: false,
        livrable: false,
        message: `❌ Impossible de localiser l'adresse de livraison. Vérifiez qu'elle est correcte. (${error.message})`
      }, { status: 200 });
    }

    // Préférence : utiliser les coordonnées stockées en base si disponibles
    if (restaurantData?.latitude && restaurantData?.longitude) {
      const lat = parseFloat(restaurantData.latitude);
      const lng = parseFloat(restaurantData.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        restaurantCoords = {
          lat: Math.round(lat * 100) / 100,
          lng: Math.round(lng * 100) / 100,
          display_name: restaurantAddress || restaurantName
        };
      }
    }

    // Sinon, géocoder l'adresse du restaurant (cache séparé)
    if (!restaurantCoords && restaurantAddress) {
      try {
        const coords = await getCoordinatesWithCache(restaurantAddress, { prefix: 'restaurant' });
        restaurantCoords = {
          lat: coords.lat,
          lng: coords.lng,
          display_name: coords.display_name || restaurantAddress
        };
      } catch (error) {
        console.warn('⚠️ Géocodage restaurant échoué, utilisation des coordonnées par défaut:', error.message);
      }
    }

    if (!restaurantCoords) {
      restaurantCoords = {
        lat: DEFAULT_RESTAURANT.lat,
        lng: DEFAULT_RESTAURANT.lng,
        display_name: DEFAULT_RESTAURANT.name
      };
    }

    // 4. Calculer la distance entre restaurant et client
    const distance = calculateDistance(
      restaurantCoords.lat, restaurantCoords.lng,
      clientCoords.lat, clientCoords.lng
    );

    // Arrondir la distance à 1 décimale pour éviter les micro-variations
    // Cela garantit que la même adresse donne toujours la même distance (et donc les mêmes frais)
    const roundedDistance = Math.round(distance * 10) / 10; // 1 décimale = précision ~100m

    console.log(`📏 Distance: ${roundedDistance.toFixed(1)}km`);

    // 5. Vérifier la distance maximum
    if (roundedDistance > MAX_DISTANCE) {
      console.log(`❌ REJET: Trop loin: ${roundedDistance.toFixed(2)}km > ${MAX_DISTANCE}km`);
      return NextResponse.json({
        success: false,
        livrable: false,
        distance: roundedDistance,
        max_distance: MAX_DISTANCE,
        message: `❌ Livraison impossible: ${roundedDistance.toFixed(1)}km (maximum ${MAX_DISTANCE}km)`
      }, { status: 200 }); // Status 200 pour que le frontend puisse parser la réponse
    }

    // 6. Déterminer les paramètres tarifaires
    const resolvedBaseFee = pickNumeric(
      [
        baseFeeOverride,
        restaurantData?.frais_livraison_base,
        restaurantData?.frais_livraison_minimum,
        restaurantData?.frais_livraison
      ],
      DEFAULT_BASE_FEE,
      { min: 0 }
    );

    let resolvedPerKmFee = pickNumeric(
      [
        perKmRate,
        body?.perKmFee,
        restaurantData?.frais_livraison_par_km,
        restaurantData?.frais_livraison_km,
        restaurantData?.delivery_fee_per_km,
        restaurantData?.tarif_kilometre
      ],
      undefined,
      { min: 0 }
    );

    if (resolvedPerKmFee === undefined) {
      // Certains restaurants peuvent avoir un indicateur spécifique pour le tarif premium
      if ((restaurantData?.tarif_livraison || restaurantData?.delivery_mode)?.toLowerCase?.() === 'premium') {
        resolvedPerKmFee = ALTERNATE_PER_KM_FEE;
      } else {
        resolvedPerKmFee = DEFAULT_PER_KM_FEE;
      }
    }

    // 7. Calculer les frais
    let deliveryFee = calculateDeliveryFee(roundedDistance, {
      baseFee: resolvedBaseFee,
      perKmFee: resolvedPerKmFee
    });

    const orderAmountNumeric = pickNumeric([orderAmount], 0, { min: 0 }) || 0;
    const resolvedFreeThreshold = pickNumeric(
      [
        freeDeliveryThreshold,
        restaurantData?.free_delivery_threshold,
        restaurantData?.livraison_gratuite_seuil
      ],
      null,
      { min: 0 }
    );

    if (resolvedFreeThreshold !== null && orderAmountNumeric >= resolvedFreeThreshold) {
      console.log(`🎁 Livraison offerte (commande ${orderAmountNumeric.toFixed(2)}€ >= seuil ${resolvedFreeThreshold}€)`);
      deliveryFee = 0;
    }

    console.log(`💰 Frais: ${resolvedBaseFee}€ + (${roundedDistance.toFixed(1)}km × ${resolvedPerKmFee}€) = ${deliveryFee.toFixed(2)}€`);

    return NextResponse.json({
      success: true,
      livrable: true,
      distance: roundedDistance,
      frais_livraison: deliveryFee,
      restaurant: restaurantName,
      restaurant_coordinates: restaurantCoords,
      client_coordinates: clientCoords,
      applied_base_fee: resolvedBaseFee,
      applied_per_km_fee: resolvedPerKmFee,
      order_amount: orderAmountNumeric,
      client_address: clientCoords.display_name,
      message: `Livraison possible: ${deliveryFee.toFixed(2)}€ (${roundedDistance.toFixed(1)}km)`
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

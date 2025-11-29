import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Client Supabase admin pour le cache (bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Configuration par défaut (utilisée si aucune donnée spécifique restaurant)
const DEFAULT_RESTAURANT = {
  lat: 43.9342,
  lng: 3.7098,
  name: 'Restaurant Ganges'
};

const DEFAULT_BASE_FEE = 2.50;      // 2.50€ de base
const DEFAULT_PER_KM_FEE = 0.50;    // 0.50€ par kilomètre (tarif standard)
const ALTERNATE_PER_KM_FEE = 0.89;  // 0.89€ par kilomètre (tarif premium éventuel)
const MAX_FEE = 10.00;              // Maximum 10€
const MAX_DISTANCE = 15;            // Maximum 15km (augmenté pour inclure Montoulieu)

// Codes postaux autorisés
const AUTHORIZED_POSTAL_CODES = ['34190', '34260'];
// Villes autorisées (fallback si le code postal n'est pas extrait correctement)
const AUTHORIZED_CITIES = ['ganges', 'laroque', 'saint-bauzille', 'sumene', 'sumène', 'montoulieu', 'cazilhac', 'pegairolles'];

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
  'pegairolles': { lat: 43.9178, lng: 3.7428, name: 'Pégairolles' },
  'montoulieu': { lat: 43.9200, lng: 3.7050, name: 'Montoulieu' } // Coordonnées approximatives
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
 * Génère plusieurs variantes d'une adresse pour le géocodage
 * TRÈS TOLÉRANTE : crée de nombreuses variantes pour gérer les fautes
 */
function generateAddressVariants(address) {
  const variants = new Set();
  
  // Variante 1 : Adresse nettoyée complète
  variants.add(cleanAddressForGeocoding(address));
  
  // Variante 2 : Adresse originale
  variants.add(address.trim());
  
  // Extraire les composants
  const postalMatch = address.match(/\b(\d{5})\b/);
  const postalCode = postalMatch ? postalMatch[1] : null;
  
  // Extraire la ville (plusieurs méthodes)
  const cityPatterns = [
    address.match(/,\s*([^,]+?)(?:\s+\d{5})?$/),
    address.match(/\b(saint[- ]?bauzille?|ganges?|laroque?|cazilhac?|sumene?|montoulieu?|pegairolles?)\b/gi)
  ];
  
  const cities = [];
  cityPatterns.forEach(pattern => {
    if (pattern) {
      const city = Array.isArray(pattern) ? pattern[0] : pattern[1];
      if (city) {
        cities.push(city.trim());
      }
    }
  });
  
  // Variante 3 : Code postal + Ville seulement
  if (postalCode && cities.length > 0) {
    cities.forEach(city => {
      variants.add(`${postalCode} ${city}, France`);
      variants.add(`${city}, ${postalCode}, France`);
    });
  }
  
  // Variante 4 : Juste le code postal (si connu)
  if (postalCode && ['34190', '34260'].includes(postalCode)) {
    const cityMap = {
      '34190': 'Ganges',
      '34260': 'Sumène'
    };
    variants.add(`${postalCode} ${cityMap[postalCode]}, France`);
  }
  
  // Variante 5 : Adresse sans accents
  const withoutAccents = address.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  variants.add(cleanAddressForGeocoding(withoutAccents));
  
  // Variante 6 : Adresse avec seulement numéro + code postal + ville
  if (postalCode && cities.length > 0) {
    const streetNumber = address.match(/^\d+/);
    if (streetNumber) {
      cities.forEach(city => {
        variants.add(`${streetNumber[0]}, ${postalCode} ${city}, France`);
      });
    }
  }
  
  return Array.from(variants).filter(v => v && v.length > 3);
}

/**
 * Géocoder une adresse avec Nominatim
 * TRÈS TOLÉRANTE : essaie de nombreuses variantes pour gérer les fautes
 */
async function geocodeAddress(address) {
  console.log('🌐 Géocodage:', address);
  
  // Générer toutes les variantes possibles
  const addressesToTry = generateAddressVariants(address);
  console.log(`🌐 ${addressesToTry.length} variantes à essayer`);
  
  let lastError = null;
  let bestMatch = null;
  
  for (const addrToTry of addressesToTry) {
    try {
      const encodedAddress = encodeURIComponent(addrToTry);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=3&countrycodes=fr`;
      
      // Timeout de 6 secondes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CVNeat-Delivery/1.0'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        continue;
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        // Prendre le premier résultat qui a un code postal valide
        for (const result of data) {
          const postcode = result.address?.postcode;
          if (postcode && ['34190', '34260'].includes(String(postcode).trim())) {
            const coords = {
              lat: parseFloat(result.lat),
              lng: parseFloat(result.lon),
              display_name: result.display_name,
              postcode: postcode,
              city: result.address?.city || result.address?.town || result.address?.village || null
            };
            
            console.log('✅ Géocodage réussi avec variante:', addrToTry);
            return coords;
          }
        }
        
        // Si aucun n'a le bon code postal mais qu'on a des résultats, garder le meilleur
        if (!bestMatch) {
          const result = data[0];
          bestMatch = {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            display_name: result.display_name,
            postcode: result.address?.postcode || null,
            city: result.address?.city || result.address?.town || result.address?.village || null
          };
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('⚠️ Échec géocodage pour:', addrToTry, error.message);
      }
      lastError = error;
      continue;
    }
  }
  
  // Si on a un match même sans le bon code postal, l'utiliser
  if (bestMatch) {
    console.log('⚠️ Géocodage avec résultat partiel:', bestMatch);
    return bestMatch;
  }
  
  // Si toutes les tentatives ont échoué
  console.error('❌ Toutes les tentatives de géocodage ont échoué');
  throw new Error('Adresse introuvable. Vérifiez le code postal (34190, 34260) et le nom de la ville.');
}

/**
 * Normalise une adresse pour le cache et le géocodage
 * Gère les accents, fautes de frappe communes, et simplifie l'adresse
 */
function normalizeAddressForCache(address) {
  if (!address || typeof address !== 'string') return '';
  
  return address
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    // Normaliser les accents (é -> e, à -> a, etc.)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Corriger les fautes communes
    .replace(/\b(st|saint|ste|sainte)\s+/gi, 'saint ')
    .replace(/\b(av|avenue)\s+/gi, 'avenue ')
    .replace(/\b(bd|boulevard)\s+/gi, 'boulevard ')
    .replace(/\b(r|rue)\s+/gi, 'rue ')
    .replace(/\b(pl|place)\s+/gi, 'place ')
    .replace(/\b(che|chemin)\s+/gi, 'chemin ')
    .replace(/\b(imp|impasse)\s+/gi, 'impasse ')
    .replace(/\b(lot|lotissement)\s+/gi, 'lotissement ')
    // Supprimer les caractères spéciaux sauf les virgules et tirets
    .replace(/[^\w\s\d,\-]/g, '')
    .replace(/\bfrance\b/gi, '')
    .replace(/\b(fr|france)\b/gi, '')
    .trim();
}

/**
 * Nettoie et corrige une adresse avant le géocodage
 * TRÈS TOLÉRANTE : accepte les fautes d'accent, fautes de frappe, formats variés
 */
function cleanAddressForGeocoding(address) {
  if (!address || typeof address !== 'string') return address;
  
  // Étape 1 : Normalisation de base
  let cleaned = address
    .trim()
    // Normaliser les espaces multiples
    .replace(/\s+/g, ' ')
    // Corriger les fautes communes de ponctuation
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*\.\s*/g, ' ')
    // Supprimer les caractères étranges mais garder les accents
    .replace(/[^\w\s\dÀ-ÿ,\-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Étape 2 : Correction intelligente des abréviations et fautes communes
  const corrections = [
    // Abréviations de rues
    { pattern: /\b(st|saint|ste|sainte)\s+/gi, replacement: 'Saint ' },
    { pattern: /\b(av|avenue|ave)\s+/gi, replacement: 'Avenue ' },
    { pattern: /\b(bd|boulevard|boul)\s+/gi, replacement: 'Boulevard ' },
    { pattern: /\b(r|rue)\s+/gi, replacement: 'Rue ' },
    { pattern: /\b(pl|place)\s+/gi, replacement: 'Place ' },
    { pattern: /\b(che|chemin|chem)\s+/gi, replacement: 'Chemin ' },
    { pattern: /\b(imp|impasse)\s+/gi, replacement: 'Impasse ' },
    { pattern: /\b(lot|lotissement|lotiss)\s+/gi, replacement: 'Lotissement ' },
    { pattern: /\b(all|allée|allee)\s+/gi, replacement: 'Allée ' },
    { pattern: /\b(res|residence|résidence)\s+/gi, replacement: 'Résidence ' },
    
    // Fautes communes de villes
    { pattern: /\bgange\b/gi, replacement: 'Ganges' },
    { pattern: /\blaroq\b/gi, replacement: 'Laroque' },
    { pattern: /\bsaint\s*bauzil\b/gi, replacement: 'Saint-Bauzille' },
    { pattern: /\bsaint\s*bauzille\s*de\s*putois\b/gi, replacement: 'Saint-Bauzille-de-Putois' },
    { pattern: /\bcazilhac\b/gi, replacement: 'Cazilhac' },
    { pattern: /\bsumene\b/gi, replacement: 'Sumène' },
  ];
  
  corrections.forEach(({ pattern, replacement }) => {
    cleaned = cleaned.replace(pattern, replacement);
  });
  
  // Étape 3 : Normaliser les codes postaux (s'assurer qu'ils sont à 5 chiffres)
  cleaned = cleaned.replace(/\b(\d{4})\b/g, (match, digits) => {
    // Si c'est un code postal de 4 chiffres, ajouter un 0 devant
    if (digits.length === 4 && !cleaned.includes('34190') && !cleaned.includes('34260')) {
      return '0' + digits;
    }
    return match;
  });
  
  // Étape 4 : Si pas de code postal visible, essayer de l'ajouter depuis la ville
  if (!/\b\d{5}\b/.test(cleaned)) {
    // Mapper les villes communes à leurs codes postaux (version très tolérante)
    const cityPostalMap = {
      'gange': '34190',
      'ganges': '34190',
      'laroq': '34190',
      'laroque': '34190',
      'saint-bauzil': '34190',
      'saint-bauzille': '34190',
      'saint bauzil': '34190',
      'saint bauzille': '34190',
      'bauzil': '34190',
      'bauzille': '34190',
      'cazilhac': '34190',
      'cazilh': '34190',
      'sumene': '34260',
      'sumène': '34260',
      'sumen': '34260'
    };
    
    // Normaliser l'adresse pour la recherche (sans accents, minuscules)
    const normalizedForSearch = cleaned.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ');
    
    // Chercher une correspondance de ville (même partielle)
    for (const [cityKey, postal] of Object.entries(cityPostalMap)) {
      const normalizedCity = cityKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Correspondance exacte ou partielle
      if (normalizedForSearch.includes(normalizedCity) || 
          normalizedCity.includes(normalizedForSearch.split(',')[1]?.trim() || '')) {
        // Ajouter le code postal si pas déjà présent
        if (!cleaned.includes(postal)) {
          // Ajouter avant la dernière virgule ou à la fin
          const parts = cleaned.split(',');
          if (parts.length > 1) {
            parts[parts.length - 1] = ` ${postal} ${parts[parts.length - 1].trim()}`;
            cleaned = parts.join(',');
          } else {
            cleaned = `${cleaned}, ${postal}`;
          }
        }
        break;
      }
    }
  }
  
  // Étape 5 : Ajouter "France" si pas présent (pour améliorer le géocodage)
  if (!cleaned.toLowerCase().includes('france')) {
    cleaned = `${cleaned}, France`;
  }
  
  return cleaned.trim();
}

function extractPostalCode(address) {
  if (!address || typeof address !== 'string') return null;
  // Chercher un code postal français (5 chiffres)
  const match = address.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

function extractCity(address) {
  if (!address || typeof address !== 'string') return null;
  
  // Extraire la ville (généralement avant le code postal ou après une virgule)
  const parts = address.split(',').map(p => p.trim());
  
  // Chercher dans les parties qui ne sont pas le code postal
  for (const part of parts) {
    // Ignorer les codes postaux et les numéros de rue
    if (!part.match(/^\d{5}$/) && !part.match(/^\d+$/)) {
      // Normaliser en gardant les lettres (même avec accents)
      const normalized = part.toLowerCase().trim();
      // Retirer les codes postaux qui pourraient être collés
      const cleaned = normalized.replace(/\s+\d{5}\s*$/, '').trim();
      
      if (cleaned.length > 2) {
        // Retourner la version normalisée sans accents pour la comparaison
        return cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      }
    }
  }
  
  // Si pas trouvé, chercher après le dernier espace (format "Rue, Ville 34190")
  const lastSpaceMatch = address.match(/\s+([A-Za-zÀ-ÿ\s-]+?)\s+\d{5}/);
  if (lastSpaceMatch) {
    const city = lastSpaceMatch[1].trim();
    if (city.length > 2) {
      return city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
  }
  
  return null;
}

function buildCacheKey(address, prefix = 'addr') {
  const postalCode = extractPostalCode(address);
  const city = extractCity(address);
  const normalizedAddress = normalizeAddressForCache(address);
  
  // Utiliser code postal + ville + adresse normalisée pour un cache plus stable
  const keyParts = [prefix];
  if (postalCode) keyParts.push(postalCode);
  if (city) keyParts.push(city);
  keyParts.push(normalizedAddress.slice(0, 50)); // Limiter la longueur
  
  return keyParts.join('_');
}

function buildAddressHash(address) {
  const postalCode = extractPostalCode(address);
  const city = extractCity(address);
  const normalizedAddress = normalizeAddressForCache(address);
  
  // Créer un hash stable de l'adresse
  const hashInput = `${postalCode || ''}_${city || ''}_${normalizedAddress}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

async function getCoordinatesWithCache(address, { prefix = 'addr' } = {}) {
  const cacheKey = buildCacheKey(address, prefix);
  const addressHash = buildAddressHash(address);
  
  // 1. Vérifier le cache en mémoire (rapide)
  const cache = prefix === 'restaurant' ? restaurantCache : coordinatesCache;
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    console.log(`📍 Coordonnées depuis le cache mémoire (${prefix}):`, cached);
    return cached;
  }

  // 2. Vérifier le cache Supabase (persistant)
  try {
    const { data: cachedData, error: cacheError } = await supabaseAdmin
      .from('geocoded_addresses_cache')
      .select('latitude, longitude, postal_code, city, display_name')
      .eq('address_hash', addressHash)
      .single();

    if (!cacheError && cachedData) {
      // Mettre à jour last_used_at
      await supabaseAdmin
        .from('geocoded_addresses_cache')
        .update({ last_used_at: new Date().toISOString() })
        .eq('address_hash', addressHash);

      const coords = {
        lat: parseFloat(cachedData.latitude),
        lng: parseFloat(cachedData.longitude),
        postcode: cachedData.postal_code,
        city: cachedData.city,
        display_name: cachedData.display_name || address
      };
      
      // Mettre en cache mémoire aussi
      cache.set(cacheKey, coords);
      console.log(`📍 Coordonnées depuis le cache Supabase (${prefix}):`, coords);
      return coords;
    }
  } catch (error) {
    console.warn('⚠️ Erreur lors de la récupération du cache Supabase:', error.message);
    // Continuer avec le géocodage si le cache échoue
  }

  // 3. Géocoder avec Nominatim
  const coords = await geocodeAddress(address);
  console.log(`📍 Coordonnées depuis Nominatim (${prefix}):`, coords);

  // Arrondir à 3 décimales pour une meilleure précision tout en gardant la cohérence
  // 3 décimales = précision ~100m, ce qui est suffisant pour les calculs de livraison
  coords.lat = Math.round(coords.lat * 1000) / 1000;
  coords.lng = Math.round(coords.lng * 1000) / 1000;

  // 4. Stocker dans le cache Supabase (persistant)
  try {
    await supabaseAdmin
      .from('geocoded_addresses_cache')
      .upsert({
        address_hash: addressHash,
        address: address,
        latitude: coords.lat,
        longitude: coords.lng,
        postal_code: coords.postcode || extractPostalCode(address),
        city: coords.city || extractCity(address),
        display_name: coords.display_name || address,
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'address_hash'
      });
    console.log(`💾 Coordonnées mises en cache Supabase (${prefix})`);
  } catch (error) {
    console.warn('⚠️ Erreur lors de la mise en cache Supabase:', error.message);
    // Continuer même si le cache échoue
  }

  // 5. Mettre en cache mémoire aussi
  if (cache.size > 1000) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(cacheKey, coords);
  console.log(`💾 Coordonnées mises en cache mémoire (${prefix})`);

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
 * FORMULE: 2.50€ de base + 0.50€ par kilomètre
 * IMPORTANT: Arrondir à 2 décimales pour éviter les micro-variations
 * GARANTIR un minimum de 2.50€ (frais de base)
 */
function calculateDeliveryFee(distance, {
  baseFee = DEFAULT_BASE_FEE,
  perKmFee = DEFAULT_PER_KM_FEE
} = {}) {
  // S'assurer que la distance n'est pas négative
  const safeDistance = Math.max(0, distance || 0);
  
  // FORMULE: baseFee (2.50€) + (distance en km × perKmFee (0.50€))
  const fee = baseFee + (safeDistance * perKmFee);
  
  // Plafonner à MAX_FEE (10.00€)
  const cappedFee = Math.min(fee, MAX_FEE);
  
  // GARANTIR un minimum de 2.50€ (frais de base)
  const minFee = Math.max(cappedFee, DEFAULT_BASE_FEE);
  
  // Arrondir à 2 décimales pour garantir la cohérence
  return Math.round(minFee * 100) / 100;
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

    // 1. Récupérer les informations du restaurant si disponibles
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
      console.error('❌ Géocodage échoué pour l\'adresse client:', error.message);
      
      // Message d'erreur simple et encourageant
      const postalCode = extractPostalCode(clientAddress);
      let errorMessage = 'Adresse introuvable. ';
      let suggestions = [];
      
      if (!postalCode) {
        errorMessage += 'Ajoutez le code postal. ';
        suggestions.push('Exemple: "123 Rue, 34190 Ganges"');
      } else if (!AUTHORIZED_POSTAL_CODES.includes(postalCode)) {
        errorMessage += `Zone non desservie. `;
        suggestions.push('Codes postaux acceptés: 34190 (Ganges, Laroque, Saint-Bauzille, Cazilhac, Montoulieu), 34260 (Sumène)');
      } else {
        errorMessage += 'Vérifiez l\'adresse. ';
        suggestions.push('Format: "Numéro + Rue, Code postal + Ville"');
        suggestions.push('Exemple: "28 Lotissement Aubanel, 34190 Laroque"');
      }
      
      return NextResponse.json({
        success: false,
        livrable: false,
        message: errorMessage,
        suggestions: suggestions,
        hint: 'Les petites fautes d\'orthographe sont acceptées, mais le code postal doit être correct.'
      }, { status: 200 });
    }

    // Vérifier que le code postal est dans une zone desservie (en se basant sur l'adresse saisie et le géocodage)
    // Extraire tous les codes postaux possibles
    const postalCodeFromAddress = extractPostalCode(clientAddress);
    const postalCodeFromGeocode = clientCoords.postcode ? String(clientCoords.postcode).trim() : null;
    
    const postalCodeMatches = [
      postalCodeFromAddress,
      postalCodeFromGeocode
    ]
      .filter(Boolean)
      .map(code => String(code).trim().padStart(5, '0')); // Normaliser à 5 chiffres

    // Vérifier si au moins un code postal correspond
    let hasAuthorizedPostalCode = postalCodeMatches.some(code => AUTHORIZED_POSTAL_CODES.includes(code));

    // Fallback: si pas de code postal détecté mais la ville est autorisée via Nominatim
    if (!hasAuthorizedPostalCode) {
      const cityFromAddress = extractCity(clientAddress);
      const cityFromGeocode = clientCoords.city ? String(clientCoords.city).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : null;
      
      const citiesToCheck = [cityFromAddress, cityFromGeocode].filter(Boolean);
      
      // Normaliser les villes autorisées aussi
      const normalizedAuthCities = AUTHORIZED_CITIES.map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
      
      for (const city of citiesToCheck) {
        // Vérifier si la ville correspond (même partiellement)
        const matches = normalizedAuthCities.some(authCity => {
          // Correspondance exacte ou partielle
          return city.includes(authCity) || authCity.includes(city) || 
                 // Correspondance avec fautes communes (ex: "saint bauzille" vs "saint-bauzille")
                 city.replace(/[\s-]/g, '').includes(authCity.replace(/[\s-]/g, '')) ||
                 authCity.replace(/[\s-]/g, '').includes(city.replace(/[\s-]/g, ''));
        });
        
        if (matches) {
          console.log('✅ Ville autorisée détectée:', city);
          hasAuthorizedPostalCode = true;
          break;
        }
      }
    }

      if (!hasAuthorizedPostalCode) {
      console.log('❌ Code postal non autorisé:', {
        postalCodes: postalCodeMatches,
        fromAddress: postalCodeFromAddress,
        fromGeocode: postalCodeFromGeocode,
        address: clientCoords.display_name || clientAddress,
        city: clientCoords.city
      });
      return NextResponse.json({
        success: false,
        livrable: false,
        message: '❌ Livraison non disponible pour cette adresse. Zones desservies : 34190 (Ganges, Laroque, Saint-Bauzille, Cazilhac, Montoulieu), 34260 (Sumène).'
      }, { status: 200 });
    }

    // Préférence : utiliser les coordonnées stockées en base si disponibles
    if (restaurantData?.latitude && restaurantData?.longitude) {
      const lat = parseFloat(restaurantData.latitude);
      const lng = parseFloat(restaurantData.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      restaurantCoords = {
        lat: Math.round(lat * 1000) / 1000, // 3 décimales pour cohérence
        lng: Math.round(lng * 1000) / 1000,
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

    // 4. Vérifier que les coordonnées sont valides
    if (!restaurantCoords || !restaurantCoords.lat || !restaurantCoords.lng) {
      console.error('❌ ERREUR: Coordonnées restaurant invalides:', restaurantCoords);
      return NextResponse.json({
        success: false,
        error: 'Coordonnées restaurant invalides',
        message: 'Erreur lors de la récupération des coordonnées du restaurant'
      }, { status: 500 });
    }
    
    if (!clientCoords || !clientCoords.lat || !clientCoords.lng) {
      console.error('❌ ERREUR: Coordonnées client invalides:', clientCoords);
      return NextResponse.json({
        success: false,
        error: 'Coordonnées client invalides',
        message: 'Erreur lors du géocodage de l\'adresse de livraison'
      }, { status: 500 });
    }

    // 5. Calculer la distance entre restaurant et client
    // IMPORTANT: Arrondir les coordonnées AVANT le calcul pour garantir la cohérence
    const restaurantLat = Math.round(restaurantCoords.lat * 1000) / 1000; // 3 décimales = ~100m
    const restaurantLng = Math.round(restaurantCoords.lng * 1000) / 1000;
    const clientLat = Math.round(clientCoords.lat * 1000) / 1000;
    const clientLng = Math.round(clientCoords.lng * 1000) / 1000;
    
    // Vérifier que les coordonnées sont des nombres valides
    if (isNaN(restaurantLat) || isNaN(restaurantLng) || isNaN(clientLat) || isNaN(clientLng)) {
      console.error('❌ ERREUR: Coordonnées non numériques', {
        restaurantLat, restaurantLng, clientLat, clientLng
      });
      return NextResponse.json({
        success: false,
        error: 'Coordonnées invalides',
        message: 'Erreur lors du calcul de la distance'
      }, { status: 500 });
    }
    
    const rawDistance = calculateDistance(
      restaurantLat, restaurantLng,
      clientLat, clientLng
    );

    // VÉRIFICATION IMPORTANTE : Si la distance est exactement 0 km, c'est probablement une erreur de géocodage
    // (même coordonnées = même adresse que le restaurant, ce qui est anormal)
    if (rawDistance < 0.01) { // Moins de 10 mètres = probablement une erreur
      console.error('⚠️ ATTENTION: Distance très faible (< 10m) - probable erreur de géocodage');
      console.error('   Coordonnées restaurant:', restaurantLat, restaurantLng);
      console.error('   Coordonnées client:', clientLat, clientLng);
      console.error('   Adresse client:', clientAddress);
      // On continue quand même, mais avec un minimum pour garantir des frais corrects
    }

    // Garantir un minimum de 0.5 km pour éviter les frais à exactement 2.50€
    // Même les adresses très proches (même bâtiment) doivent avoir au moins 0.5 km
    // Cela garantit : 2.50€ + (0.5 × 0.50€) = 2.75€ minimum
    const MIN_DISTANCE = 0.5; // Minimum 0.5 km
    const distanceWithMinimum = Math.max(rawDistance, MIN_DISTANCE);

    // Arrondir la distance à 1 décimale pour éviter les micro-variations
    // Cela garantit que la même adresse donne toujours la même distance (et donc les mêmes frais)
    const roundedDistance = Math.round(distanceWithMinimum * 10) / 10; // 1 décimale = précision ~100m

    console.log(`📏 Distance: ${roundedDistance.toFixed(1)}km (brut: ${rawDistance.toFixed(2)}km, minimum ${MIN_DISTANCE}km appliqué: ${rawDistance < MIN_DISTANCE ? 'OUI' : 'NON'})`);
    console.log(`📏 Coordonnées restaurant: ${restaurantLat.toFixed(3)}, ${restaurantLng.toFixed(3)}`);
    console.log(`📏 Coordonnées client: ${clientLat.toFixed(3)}, ${clientLng.toFixed(3)}`);

    // 6. Vérifier la distance maximum
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

    // 7. Déterminer les paramètres tarifaires
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

    // 8. Calculer les frais
    // FORMULE FIXE: 2.50€ de base + 0.50€ par kilomètre
    // TOUTES les commandes suivent cette formule, SANS exception
    const finalDistance = roundedDistance;
    
    // TOUJOURS appliquer la formule : baseFee + (distance × perKmFee)
    const deliveryFee = calculateDeliveryFee(finalDistance, {
      baseFee: resolvedBaseFee,
      perKmFee: resolvedPerKmFee
    });

    console.log(`💰 Frais: ${resolvedBaseFee}€ + (${finalDistance.toFixed(1)}km × ${resolvedPerKmFee}€) = ${deliveryFee.toFixed(2)}€`);

    // Calculer orderAmountNumeric pour la réponse
    const orderAmountNumeric = pickNumeric([orderAmount], 0, { min: 0 }) || 0;

    return NextResponse.json({
      success: true,
      livrable: true,
      distance: finalDistance,
      raw_distance: roundedDistance, // Distance brute pour debug
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
    console.error('❌ Type:', error.name);
    console.error('❌ Message:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    // Message d'erreur plus détaillé
    let errorMessage = 'Erreur lors du calcul des frais de livraison';
    if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  CAZILHAC_TEMP_NOTICE,
  CAZILHAC_TEMP_SURCHARGE_EUR,
  isBlockedDeliveryAddress,
  isCazilhacAddress,
} from '../../../../lib/delivery-address-rules';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Email',
  'Access-Control-Max-Age': '86400',
};

function json(body, init) {
  const res = NextResponse.json(body, init);
  for (const [k, v] of Object.entries(corsHeaders)) {
    res.headers.set(k, v);
  }
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

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

// Tarifs fixes par commune – voir docs/TARIFS-LIVRAISON-VILLAGES.md
const FEE_GANGES = 3;      // 3€ – Ganges
const FEE_5_EUR = 5;       // 5€ – Laroque, Moulès, Cazilhac
const FEE_BRISSAC = 7.5;   // 7,50€ – Brissac (un peu plus loin)
const FEE_REST = 7;        // 7€ – le reste des villages
const MAX_DISTANCE = 8;           // Max à vol d'oiseau (fallback si pas d'API route)
const MAX_DISTANCE_ROAD_KM = 10; // Max 10 km par la route (utilisé quand OpenRouteService est dispo)
const DEFAULT_BASE_FEE = 3;
const DEFAULT_PER_KM_FEE = 0.80;
const ALTERNATE_PER_KM_FEE = 0.89;
const MAX_FEE = 7.5;

// Codes postaux autorisés
const AUTHORIZED_POSTAL_CODES = ['34190', '30440'];
// Villes autorisées (fallback si le code postal n'est pas extrait correctement)
const AUTHORIZED_CITIES = ['ganges', 'laroque', 'saint-bauzille', 'sumene', 'sumène', 'cazilhac', 'brissac', 'roquedur', 'saint-laurent-le-minier', 'saint-julien-de-la-nef'];
// Villes EXCLUES (trop loin ou hors zone) – pas de livraison
const EXCLUDED_CITIES = ['pegairolles', 'saint-bresson', 'montoulieu'];

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
  
  // Autres villes (coordonnées vérifiées : distance depuis Ganges cohérente avec la réalité)
  'laroque': { lat: 43.9188, lng: 3.7146, name: 'Laroque' },
  'saint-bauzille': { lat: 43.9033, lng: 3.7067, name: 'Saint-Bauzille-de-Putois' }, // ~3,5 km de Ganges
  'sumene': { lat: 43.8994, lng: 3.7194, name: 'Sumène' },
  'cazilhac': { lat: 43.9250, lng: 3.7000, name: 'Cazilhac' },
  'montoulieu': { lat: 43.9269, lng: 3.7906, name: 'Montoulieu' },
  'brissac': { lat: 43.8500, lng: 3.7000, name: 'Brissac' },
  'la-vernede': { lat: 43.8500, lng: 3.7000, name: 'La Vernède (Brissac)' },
  'moules': { lat: 43.9500, lng: 3.7300, name: 'Moulès-et-Baucels' },
  'agones': { lat: 43.9042, lng: 3.7211, name: 'Agonès' },
  'gornies': { lat: 43.8833, lng: 3.6167, name: 'Gorniès' },
  'saint-julien-de-la-nef': { lat: 43.9667, lng: 3.6833, name: 'Saint-Julien-de-la-Nef' },
  'saint-martial': { lat: 43.9833, lng: 3.7333, name: 'Saint-Martial' },
  'saint-roman-de-codieres': { lat: 43.9500, lng: 3.7667, name: 'Saint-Roman-de-Codières' },
  'roquedur': { lat: 43.9750, lng: 3.6750, name: 'Roquedur' },
  'saint-laurent-le-minier': { lat: 43.9333, lng: 3.6500, name: 'Saint-Laurent-le-Minier' }
};

// Centres des communes pour le "snap" (une entrée par commune, pour frais stables)
const SNAP_TOWN_CENTERS = [
  { lat: 43.9342, lng: 3.7098, name: 'Ganges' },
  { lat: 43.9188, lng: 3.7146, name: 'Laroque' },
  { lat: 43.9033, lng: 3.7067, name: 'Saint-Bauzille-de-Putois' },
  { lat: 43.8994, lng: 3.7194, name: 'Sumène' },
  { lat: 43.9250, lng: 3.7000, name: 'Cazilhac' },
  { lat: 43.9269, lng: 3.7906, name: 'Montoulieu' },
  { lat: 43.8500, lng: 3.7000, name: 'Brissac' },
  { lat: 43.9500, lng: 3.7300, name: 'Moulès-et-Baucels' },
  { lat: 43.9042, lng: 3.7211, name: 'Agonès' },
  { lat: 43.8833, lng: 3.6167, name: 'Gorniès' },
  { lat: 43.9667, lng: 3.6833, name: 'Saint-Julien-de-la-Nef' },
  { lat: 43.9833, lng: 3.7333, name: 'Saint-Martial' },
  { lat: 43.9500, lng: 3.7667, name: 'Saint-Roman-de-Codières' },
  { lat: 43.9750, lng: 3.6750, name: 'Roquedur' },
  { lat: 43.9333, lng: 3.6500, name: 'Saint-Laurent-le-Minier' }
];
const SNAP_RADIUS_KM = 4; // Si le point géocodé est à moins de 4 km d'un centre, on utilise ce centre (frais stables, évite rejets abusifs)
const MAX_DISTANCE_ROAD_KM_ZONE = 13; // Max 13 km quand CP 34190/30440 (évite rejets à tort, ex. 7 av Jeanne d'Arc Brissac)

/**
 * Distance par la route (OpenRouteService) – retourne km ou null si indisponible.
 * Coordonnées : lat, lng (WGS84). API attend [lng, lat].
 */
async function getDrivingDistanceKm(originLat, originLng, destLat, destLng) {
  const apiKey = process.env.OPENROUTE_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
    const body = {
      coordinates: [
        [originLng, originLat],
        [destLng, destLat]
      ]
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      console.warn('⚠️ OpenRouteService HTTP', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json();
    const distanceM = data.routes?.[0]?.summary?.distance;
    if (typeof distanceM !== 'number' || distanceM < 0) return null;
    return Math.round((distanceM / 1000) * 10) / 10; // km, 1 décimale
  } catch (err) {
    console.warn('⚠️ OpenRouteService erreur:', err.message);
    return null;
  }
}

/**
 * Calculer la distance entre deux points (Haversine, vol d'oiseau)
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
  const   cityPatterns = [
    address.match(/,\s*([^,]+?)(?:\s+\d{5})?$/),
    address.match(/\b(saint[- ]?bauzille?|ganges?|laroque?|cazilhac?|sumene?|sumène?|montoulieu?|pegairolles?|brissac?|vernede|vernède)\b/gi)
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
  if (postalCode && ['34190', '30440'].includes(postalCode)) {
    const cityMap = {
      '34190': 'Ganges',
      '30440': 'Sumène'
    };
    variants.add(`${postalCode} ${cityMap[postalCode]}, France`);
  }
  
  // Variante 5 : Adresse sans accents
  const withoutAccents = address.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  variants.add(cleanAddressForGeocoding(withoutAccents));
  
  // Variante 6 : Adresse avec seulement numéro + code postal + ville
  if (postalCode && cities.length > 0) {
    const streetNumber = address.match(/^\d+(\s+(bis|ter|quater))?/i);
    if (streetNumber) {
      cities.forEach(city => {
        variants.add(`${streetNumber[0]}, ${postalCode} ${city}, France`);
        variants.add(`${streetNumber[0]} ${postalCode} ${city}, France`);
      });
    }
  }
  
  // Variante 7 : Si Sumène est détectée mais pas de code postal, ajouter 30440
  const hasSumene = address.toLowerCase().includes('sumene') || address.toLowerCase().includes('sumène');
  if (hasSumene && !postalCode) {
    const streetNumber = address.match(/^\d+(\s+(bis|ter|quater))?/i);
    const streetName = address.replace(/^\d+(\s+(bis|ter|quater))?\s*/i, '').replace(/,\s*\d{5}.*$/, '').replace(/,\s*sumene.*$/i, '').replace(/,\s*sumène.*$/i, '').trim();
    if (streetNumber && streetName) {
      variants.add(`${streetNumber[0]} ${streetName}, 30440 Sumène, France`);
      variants.add(`${streetNumber[0]}, ${streetName}, 30440 Sumène, France`);
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
        // SIMPLIFICATION: Prendre le premier résultat valide (plus de filtrage par code postal)
        // La distance sera vérifiée après le géocodage
        const result = data[0];
        const coords = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          display_name: result.display_name,
          postcode: result.address?.postcode || null,
          city: result.address?.city || result.address?.town || result.address?.village || null
        };
        
        console.log('✅ Géocodage réussi avec variante:', addrToTry);
        return coords;
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
  throw new Error('Adresse introuvable. Vérifiez l\'adresse et réessayez.');
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
    if (digits.length === 4 && !cleaned.includes('34190') && !cleaned.includes('30440')) {
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
      'brissac': '34190',
      'vernede': '34190',
      'vernède': '34190',
      'la vernede': '34190',
      'sumene': '30440',
      'sumène': '30440',
      'sumen': '30440'
    };
    
    // Normaliser l'adresse pour la recherche (sans accents, minuscules)
    const normalizedForSearch = cleaned.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ');
    
    // Chercher une correspondance de ville (même partielle)
    for (const [cityKey, postal] of Object.entries(cityPostalMap)) {
      const normalizedCity = cityKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Correspondance exacte ou partielle (vérifier dans toute l'adresse, pas seulement après la virgule)
      if (normalizedForSearch.includes(normalizedCity) || 
          normalizedCity.includes(normalizedForSearch.split(',')[1]?.trim() || '') ||
          normalizedForSearch.includes(normalizedCity)) {
        // Ajouter le code postal si pas déjà présent
        if (!cleaned.includes(postal)) {
          // Si l'adresse contient déjà la ville, ajouter le code postal avant
          const cityRegex = new RegExp(`\\b${cityKey}\\b`, 'i');
          if (cityRegex.test(cleaned)) {
            cleaned = cleaned.replace(cityRegex, `${postal} $&`);
          } else {
            // Ajouter avant la dernière virgule ou à la fin
            const parts = cleaned.split(',');
            if (parts.length > 1) {
              parts[parts.length - 1] = ` ${postal} ${parts[parts.length - 1].trim()}`;
              cleaned = parts.join(',');
            } else {
              cleaned = `${cleaned}, ${postal}`;
            }
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

/** Zones tarifaires fixes (utilisé par getDeliveryZoneFromAddress si besoin). */
const DELIVERY_ZONE_FEE = {
  ganges: FEE_GANGES,
  'ganges-centre': FEE_GANGES,
  'ganges-nord': FEE_GANGES,
  'ganges-sud': FEE_GANGES,
  'ganges-est': FEE_GANGES,
  'ganges-ouest': FEE_GANGES,
  laroque: FEE_5_EUR,
  cazilhac: FEE_5_EUR,
  'saint-bauzille': FEE_REST,
  sumene: FEE_REST,
  moules: FEE_5_EUR,
  agones: FEE_REST,
  'saint-laurent-le-minier': FEE_REST,
  'saint-julien-de-la-nef': FEE_REST,
  brissac: FEE_BRISSAC,
  montoulieu: FEE_REST,
  gornies: FEE_REST,
  'saint-martial': FEE_REST,
  'saint-roman-de-codieres': FEE_REST,
  roquedur: FEE_REST
};

/**
 * Retourne le tarif fixe de livraison (3, 5 ou 7 €) selon la ville détectée dans l'adresse, ou null.
 */
function getDeliveryZoneFromAddress(address) {
  if (!address || typeof address !== 'string') return null;
  const normalized = address.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ');
  const townKeys = [
    { key: 'ganges-centre', patterns: ['ganges'] },
    { key: 'montoulieu', patterns: ['montoulieu'] },
    { key: 'saint-bauzille', patterns: ['saint bauzille', 'saint-bauzille', 'bauzille', 'bauzil', 'putois'] },
    { key: 'laroque', patterns: ['laroque'] },
    { key: 'sumene', patterns: ['sumene', 'sumène'] },
    { key: 'cazilhac', patterns: ['cazilhac'] },
    { key: 'brissac', patterns: ['brissac', 'vernede', 'vernède', 'la vernede'] },
    { key: 'moules', patterns: ['moules', 'moulès', 'baucels'] },
    { key: 'agones', patterns: ['agones', 'agonès'] },
    { key: 'gornies', patterns: ['gornies', 'gorniès'] },
    { key: 'saint-julien-de-la-nef', patterns: ['saint julien', 'saint-julien-de-la-nef'] },
    { key: 'roquedur', patterns: ['roquedur'] },
    { key: 'saint-laurent-le-minier', patterns: ['saint laurent', 'saint-laurent', 'minier'] },
    { key: 'saint-martial', patterns: ['saint martial'] },
    { key: 'saint-roman-de-codieres', patterns: ['saint roman', 'saint-roman', 'codieres', 'codières'] }
  ];
  for (const { key, patterns } of townKeys) {
    if (patterns.some(p => normalized.includes(p))) {
      const fee = DELIVERY_ZONE_FEE[key];
      if (fee != null) return fee;
    }
  }
  return null;
}

/**
 * Retourne le centre de la commune connue le plus proche du point (lat, lng) si à moins de radiusKm.
 * Permet de stabiliser les frais : une adresse géocodée "dans" Laroque utilise toujours le centre Laroque.
 */
function getNearestKnownTownWithinRadius(lat, lng, radiusKm = SNAP_RADIUS_KM) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
  let nearest = null;
  let minDist = radiusKm + 1;
  for (const town of SNAP_TOWN_CENTERS) {
    const d = calculateDistance(lat, lng, town.lat, town.lng);
    if (d < minDist) {
      minDist = d;
      nearest = town;
    }
  }
  return nearest;
}

/**
 * True si l'adresse contient une rue précise (ex. "7 av Jeanne d'Arc") → on garde le géocodage pour la vraie distance.
 * Sinon (ex. "Brissac" seul) on peut utiliser le centre de la commune.
 */
function hasExplicitStreetAddress(address) {
  if (!address || typeof address !== 'string') return false;
  const n = address.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hasNumber = /\d/.test(n);
  const hasStreet = /\b(rue|av\.?|avenue[s]?|route|chemin|lotissement|place|bd|boulevard|impasse|allee|cours)\b/i.test(n);
  return hasNumber && hasStreet;
}

/**
 * Si l'adresse client correspond à une ville connue (COORDINATES_DB), retourne ses coordonnées.
 */
function getKnownTownCoordsFromAddress(address) {
  if (!address || typeof address !== 'string') return null;
  const normalized = address.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ');
  const townKeys = [
    { key: 'montoulieu', patterns: ['montoulieu'] },
    { key: 'saint-bauzille', patterns: ['saint bauzille', 'saint-bauzille', 'bauzille', 'bauzil', 'putois'] },
    { key: 'laroque', patterns: ['laroque'] },
    { key: 'sumene', patterns: ['sumene', 'sumène'] },
    { key: 'cazilhac', patterns: ['cazilhac'] },
    { key: 'ganges-centre', patterns: ['ganges'] },
    { key: 'brissac', patterns: ['brissac', 'vernede', 'vernède', 'la vernede'] },
    { key: 'moules', patterns: ['moules', 'moulès', 'baucels'] },
    { key: 'agones', patterns: ['agones', 'agonès'] },
    { key: 'gornies', patterns: ['gornies', 'gorniès'] },
    { key: 'saint-julien-de-la-nef', patterns: ['saint julien', 'saint-julien-de-la-nef'] },
    { key: 'roquedur', patterns: ['roquedur'] },
    { key: 'saint-laurent-le-minier', patterns: ['saint laurent', 'saint-laurent', 'minier'] },
    { key: 'saint-martial', patterns: ['saint martial'] },
    { key: 'saint-roman-de-codieres', patterns: ['saint roman', 'saint-roman', 'codieres', 'codières'] }
  ];
  for (const { key, patterns } of townKeys) {
    if (patterns.some(p => normalized.includes(p))) {
      const entry = COORDINATES_DB[key];
      if (entry) {
        return { lat: entry.lat, lng: entry.lng, display_name: entry.name, city: entry.name };
      }
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
 * Frais de livraison : Ganges = 3€ ; hors Ganges = 3€ + 0,80€/km, plafond 7€.
 */
function calculateDeliveryFee(distance, {
  baseFee = DEFAULT_BASE_FEE,
  perKmFee = DEFAULT_PER_KM_FEE
} = {}) {
  const safeDistance = Math.max(0, distance || 0);
  const fee = baseFee + (safeDistance * perKmFee);
  const capped = Math.min(Math.max(fee, baseFee), MAX_FEE);
  return Math.round(capped * 100) / 100;
}

/** True si l'adresse correspond à Ganges (ville). */
function isGangesAddress(address) {
  if (!address || typeof address !== 'string') return false;
  const n = address.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ');
  return n.includes('ganges');
}

/** Normalise une chaîne pour comparaison (sans accents, minuscule). */
function normalizeForTown(s) {
  if (!s || typeof s !== 'string') return '';
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, ' ').trim();
}

/**
 * Frais de livraison fixes par commune : Ganges 3€, Laroque/Moulès/Cazilhac 5€, Brissac 7,50€, reste 7€.
 * Retourne le montant en € ou null si on doit garder l’ancien calcul (fallback).
 */
function getFixedDeliveryFeeByTown(city, address) {
  const cityN = normalizeForTown(city || '');
  const addrN = normalizeForTown(address || '');
  const combined = `${cityN} ${addrN}`;
  if (combined.includes('ganges')) return FEE_GANGES;
  if (combined.includes('laroque')) return FEE_5_EUR;
  if (combined.includes('moules') || combined.includes('moulès')) return FEE_5_EUR;
  if (combined.includes('cazilhac')) return FEE_5_EUR;
  if (combined.includes('brissac')) return FEE_BRISSAC;
  return FEE_REST;
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
      return json({ 
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
      return json({ 
        success: false, 
        error: 'Adresse requise',
        message: 'Adresse de livraison requise'
      }, { status: 400 });
    }

    if (isBlockedDeliveryAddress(clientAddress)) {
      return json(
        {
          success: false,
          livrable: false,
          message:
            'Cette adresse n’est plus livrable. Merci de renseigner une autre adresse de livraison.',
          code: 'BLOCKED_DELIVERY_ADDRESS',
        },
        { status: 200 }
      );
    }

    console.log('🚚 === CALCUL LIVRAISON 5.0 ===');
    console.log('Adresse client:', clientAddress);

    // 1. Récupérer les informations du restaurant si disponibles
    let restaurantData = null;
    if (restaurantId) {
      try {
        const { data, error } = await supabaseAdmin
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .single();

        if (error) {
          console.warn('⚠️ Impossible de récupérer le restaurant', restaurantId, error);
        } else if (data) {
          restaurantData = data;
          console.log(`✅ Restaurant récupéré: ${data.nom} - Coordonnées: ${data.latitude || 'N/A'}, ${data.longitude || 'N/A'}`);
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
    let clientCoordsForDistance;

    try {
      clientCoords = await getCoordinatesWithCache(clientAddress, { prefix: 'client' });
      // Toujours utiliser le point géocodé pour la distance (évite 7€ partout : Laroque, Moulès etc.)
      clientCoordsForDistance = { lat: clientCoords.lat, lng: clientCoords.lng };
    } catch (error) {
      console.error('❌ Géocodage échoué pour l\'adresse client:', error.message);
      
      // Message d'erreur simple
      let errorMessage = 'Adresse introuvable. ';
      let suggestions = [];
      
      errorMessage += 'Vérifiez l\'adresse et réessayez. ';
      suggestions.push('Format: "Numéro + Rue, Code postal + Ville"');
      suggestions.push('Exemple: "28 Lotissement Aubanel, 34190 Laroque"');
      
      return json({
        success: false,
        livrable: false,
        message: errorMessage,
        suggestions: suggestions,
        hint: 'Les petites fautes d\'orthographe sont acceptées. La livraison est disponible dans un rayon de 8km à vol d\'oiseau (environ 10km de route réelle).'
      }, { status: 200 });
    }

    // Vérifier d'abord si la ville est explicitement exclue (AVANT la vérification du code postal)
    const normalizedClientCity = (clientCoords.city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const normalizedClientAddress = clientAddress.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    for (const excludedCity of EXCLUDED_CITIES) {
      const normalizedExcluded = excludedCity.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalizedClientCity.includes(normalizedExcluded) || normalizedClientAddress.includes(normalizedExcluded)) {
        console.log('❌ Ville exclue détectée:', excludedCity);
        return json({
          success: false,
          livrable: false,
          message: `❌ Livraison non disponible à ${excludedCity.charAt(0).toUpperCase() + excludedCity.slice(1)}. Cette zone n'est pas desservie.`
        }, { status: 200 });
      }
    }

    // Définir les coordonnées du restaurant AVANT le calcul de distance
    // Préférence : utiliser les coordonnées stockées en base si disponibles
    let restaurantCoords = null;
    if (restaurantData?.latitude && restaurantData?.longitude) {
      const lat = parseFloat(restaurantData.latitude);
      const lng = parseFloat(restaurantData.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        restaurantCoords = {
          lat: Math.round(lat * 1000) / 1000, // 3 décimales pour cohérence
          lng: Math.round(lng * 1000) / 1000,
          display_name: restaurantAddress || restaurantName
        };
        console.log(`✅ Coordonnées restaurant depuis base: ${restaurantCoords.lat}, ${restaurantCoords.lng}`);
      }
    }

    // Si le restaurant est à Ganges (vérifier par ville ou code postal), utiliser les coordonnées par défaut
    // pour éviter les erreurs de géocodage qui donnent des distances incorrectes
    const isGangesRestaurant = restaurantData?.ville?.toLowerCase().includes('ganges') || 
                                restaurantData?.code_postal === '34190' ||
                                restaurantAddress?.toLowerCase().includes('ganges') ||
                                restaurantAddress?.includes('34190');
    
    if (!restaurantCoords && isGangesRestaurant) {
      console.log('📍 Restaurant à Ganges détecté, utilisation des coordonnées par défaut de Ganges');
      restaurantCoords = {
        lat: DEFAULT_RESTAURANT.lat,
        lng: DEFAULT_RESTAURANT.lng,
        display_name: DEFAULT_RESTAURANT.name
      };
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
        console.log(`✅ Coordonnées restaurant depuis géocodage: ${restaurantCoords.lat}, ${restaurantCoords.lng}`);
      } catch (error) {
        console.warn('⚠️ Géocodage restaurant échoué, utilisation des coordonnées par défaut:', error.message);
      }
    }

    // Utiliser les coordonnées par défaut si toujours pas définies
    if (!restaurantCoords) {
      console.log('📍 Utilisation des coordonnées par défaut de Ganges');
      restaurantCoords = {
        lat: DEFAULT_RESTAURANT.lat,
        lng: DEFAULT_RESTAURANT.lng,
        display_name: DEFAULT_RESTAURANT.name
      };
    }

    // Distance = toujours depuis le point géocodé (pas le centre-ville) → Laroque ~3 km = 5,40€, pas 7€
    const tempRestaurantLat = Math.round(restaurantCoords.lat * 1000) / 1000;
    const tempRestaurantLng = Math.round(restaurantCoords.lng * 1000) / 1000;
    const tempClientLat = Math.round(clientCoordsForDistance.lat * 1000) / 1000;
    const tempClientLng = Math.round(clientCoordsForDistance.lng * 1000) / 1000;
    const roadDistanceKm = await getDrivingDistanceKm(tempRestaurantLat, tempRestaurantLng, tempClientLat, tempClientLng);
    const haversineKm = calculateDistance(tempRestaurantLat, tempRestaurantLng, tempClientLat, tempClientLng);
    const tempRoundedDistance = roadDistanceKm != null ? roadDistanceKm : Math.round(haversineKm * 10) / 10;
    const clientPostal = extractPostalCode(clientAddress) || (clientCoords.postcode && String(clientCoords.postcode).trim()) || '';
    const isInDeliveryZonePostal = AUTHORIZED_POSTAL_CODES.includes(clientPostal);
    const maxKm = roadDistanceKm != null
      ? (isInDeliveryZonePostal ? MAX_DISTANCE_ROAD_KM_ZONE : MAX_DISTANCE_ROAD_KM)
      : (isInDeliveryZonePostal ? 10 : MAX_DISTANCE);

    console.log(roadDistanceKm != null
      ? `🔍 Distance route (OpenRouteService): ${tempRoundedDistance.toFixed(1)} km`
      : `🔍 Distance à vol d'oiseau (fallback): ${tempRoundedDistance.toFixed(1)} km`);
    console.log(`🔍 Restaurant: ${restaurantName} - Client: ${clientCoords.display_name || clientAddress}`);

    if (!isNaN(tempRoundedDistance) && tempRoundedDistance > maxKm) {
      console.log(`❌ REJET: Trop loin (${tempRoundedDistance.toFixed(1)} km > ${maxKm} km)`);
      return json({
        success: false,
        livrable: false,
        distance: tempRoundedDistance,
        max_distance: maxKm,
        distance_source: roadDistanceKm != null ? 'route' : 'vol_oiseau',
        message: `❌ Livraison impossible: ${tempRoundedDistance.toFixed(1)} km (maximum ${maxKm} km)`
      }, { status: 200 });
    }

    // 4. Vérifier que les coordonnées sont valides
    if (!restaurantCoords || !restaurantCoords.lat || !restaurantCoords.lng) {
      console.error('❌ ERREUR: Coordonnées restaurant invalides:', restaurantCoords);
      return json({
        success: false,
        error: 'Coordonnées restaurant invalides',
        message: 'Erreur lors de la récupération des coordonnées du restaurant'
      }, { status: 500 });
    }
    
    if (!clientCoords || !clientCoords.lat || !clientCoords.lng) {
      console.error('❌ ERREUR: Coordonnées client invalides:', clientCoords);
      return json({
        success: false,
        error: 'Coordonnées client invalides',
        message: 'Erreur lors du géocodage de l\'adresse de livraison'
      }, { status: 500 });
    }

    // 5. Distance utilisée : route (OpenRouteService) ou vol d'oiseau (déjà calculée au-dessus)
    const deliveryDistanceKm = tempRoundedDistance;

    const isGanges = isGangesAddress(clientAddress);
    if (deliveryDistanceKm < 0.01 || isGanges) {
      const finalDeliveryFee = 3; // Ganges = 3€ fixe
      console.log(`📏 ${isGanges ? 'Ganges (adresse)' : 'Distance très faible'} → ${finalDeliveryFee}€`);
      return json({
        success: true,
        livrable: true,
        distance: deliveryDistanceKm,
        distance_source: roadDistanceKm != null ? 'route' : 'vol_oiseau',
        frais_livraison: finalDeliveryFee,
        restaurant: restaurantName,
        restaurant_coordinates: restaurantCoords,
        client_coordinates: clientCoords,
        applied_base_fee: DEFAULT_BASE_FEE,
        applied_per_km_fee: DEFAULT_PER_KM_FEE,
        client_address: clientCoords.display_name,
        message: `Livraison possible: ${finalDeliveryFee.toFixed(2)}€ (${deliveryDistanceKm.toFixed(1)} km)`
      });
    }

    const roundedDistance = deliveryDistanceKm;
    console.log(`📏 Distance livraison: ${roundedDistance.toFixed(1)} km (source: ${roadDistanceKm != null ? 'route' : 'vol d\'oiseau'})`);

    const finalDistance = roundedDistance;
    if (isNaN(finalDistance) || finalDistance < 0) {
      console.error('❌ ERREUR: Distance invalide:', finalDistance);
      return json({
        success: false,
        error: 'Distance invalide',
        message: 'Erreur lors du calcul de la distance de livraison'
      }, { status: 500 });
    }

    // 7. Frais fixes par commune : Laroque/Moulès/Cazilhac 5€, Brissac 7,50€, reste 7€
    const baseDeliveryFee = getFixedDeliveryFeeByTown(clientCoords.city, clientAddress);
    const applyCazilhacSurcharge = isCazilhacAddress(clientAddress, clientCoords.city);
    const surchargeEur = applyCazilhacSurcharge ? CAZILHAC_TEMP_SURCHARGE_EUR : 0;
    const finalDeliveryFee = Math.round((baseDeliveryFee + surchargeEur) * 100) / 100;
    console.log(`💰 Frais (tarif commune): ${finalDeliveryFee}€`);

    const orderAmountNumeric = pickNumeric([orderAmount], 0, { min: 0 }) || 0;

    return json({
      success: true,
      livrable: true,
      distance: finalDistance,
      raw_distance: roundedDistance,
      distance_source: roadDistanceKm != null ? 'route' : 'vol_oiseau',
      frais_livraison: finalDeliveryFee,
      restaurant: restaurantName,
      restaurant_coordinates: restaurantCoords,
      client_coordinates: clientCoords,
      applied_base_fee: null,
      applied_per_km_fee: null,
      order_amount: orderAmountNumeric,
      client_address: clientCoords.display_name,
      message: `Livraison possible: ${Number(finalDeliveryFee).toFixed(2)}€ (${roundedDistance.toFixed(1)} km)`,
      ...(applyCazilhacSurcharge
        ? {
            temporary_surcharge: surchargeEur,
            delivery_notice: CAZILHAC_TEMP_NOTICE,
          }
        : {})
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
    
    return json({
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

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { 
      deliveryAddress, 
      orderAmount 
    } = await request.json();

    if (!deliveryAddress) {
      return NextResponse.json({ 
        error: 'Adresse de livraison requise' 
      }, { status: 400 });
    }

    console.log('=== CALCUL FRAIS LIVRAISON ===');
    console.log('Adresse:', deliveryAddress);
    console.log('Montant commande:', orderAmount);

    // Utiliser des coordonnées fixes
    const deliveryCoords = getCoordinatesFromAddress(deliveryAddress);
    
    if (!deliveryCoords) {
      return NextResponse.json({
        success: false,
        livrable: false,
        message: 'Impossible de localiser l\'adresse'
      });
    }

    // Distance depuis Ganges (centre de livraison)
    const gangesCoords = { lat: 43.9333, lon: 3.7167 };
    const distance = calculateDistance(
      gangesCoords.lat,
      gangesCoords.lon,
      deliveryCoords.lat,
      deliveryCoords.lon
    );

    console.log('Distance calculée:', distance);

    // Vérifier si livrable (max 10km)
    const livrable = distance <= 10;
    
    if (!livrable) {
      return NextResponse.json({
        success: false,
        livrable: false,
        message: `Livraison impossible au-delà de 10km (distance: ${distance.toFixed(2)}km)`
      });
    }

    // Votre système de tarification original
    let deliveryFee = 2.50; // 2.50€ de base
    deliveryFee += distance * 0.80; // +0.80€ par km
    
    // Plafond à 10€ maximum
    deliveryFee = Math.min(deliveryFee, 10.00);

    // Réduction pour commandes importantes (optionnel)
    if (orderAmount && orderAmount >= 50) {
      deliveryFee = 0; // Livraison gratuite pour commandes >= 50€
    } else if (orderAmount && orderAmount >= 25) {
      deliveryFee *= 0.8; // 20% de réduction pour commandes >= 25€
    }

    console.log('=== RÉSULTAT FRAIS ===');
    console.log('Distance:', distance);
    console.log('Frais calculés:', deliveryFee);

    return NextResponse.json({
      success: true,
      livrable: true,
      deliveryFee: Math.round(deliveryFee * 100) / 100,
      distance: Math.round(distance * 100) / 100,
      details: {
        distance_calculée: distance.toFixed(2),
        frais_brut: deliveryFee.toFixed(2),
        formule: `2.50€ + (${distance.toFixed(2)}km × 0.80€) = ${deliveryFee.toFixed(2)}€`
      }
    });

  } catch (error) {
    console.error('Erreur calcul frais:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Base de données de coordonnées fixes (même que calculate)
const COORDINATES_DATABASE = {
  // Hérault (34)
  'ganges': { lat: 43.9333, lon: 3.7167 },
  'montpellier': { lat: 43.6110, lon: 3.8767 },
  '34000': { lat: 43.6110, lon: 3.8767 }, // Montpellier
  '34190': { lat: 43.9333, lon: 3.7167 }, // Ganges
  '34070': { lat: 43.6110, lon: 3.8767 }, // Montpellier
  '34080': { lat: 43.6110, lon: 3.8767 }, // Montpellier
  '34090': { lat: 43.6110, lon: 3.8767 }, // Montpellier
  '34790': { lat: 43.6500, lon: 3.8000 }, // Grabels
  '34820': { lat: 43.6833, lon: 3.9167 }, // Teyran
  '34830': { lat: 43.6667, lon: 3.9000 }, // Jacou
  '34880': { lat: 43.5667, lon: 3.8000 }, // Lavérune
  
  // Pyrénées-Orientales (66)
  'saint-esteve': { lat: 42.7167, lon: 2.8500 },
  '66240': { lat: 42.7167, lon: 2.8500 }, // Saint-Esteve
  'perpignan': { lat: 42.6886, lon: 2.8948 },
  '66000': { lat: 42.6886, lon: 2.8948 }, // Perpignan
  
  // Gard (30)
  'nimes': { lat: 43.8367, lon: 4.3600 },
  '30000': { lat: 43.8367, lon: 4.3600 }, // Nîmes
  
  // Aude (11)
  'carcassonne': { lat: 43.2167, lon: 2.3500 },
  '11000': { lat: 43.2167, lon: 2.3500 }, // Carcassonne
};

// Fonction pour obtenir les coordonnées d'une adresse (coordonnées fixes)
function getCoordinatesFromAddress(address) {
  if (!address) return null;
  
  const addressLower = address.toLowerCase();
  
  // Chercher par nom de ville ou code postal
  for (const [city, coords] of Object.entries(COORDINATES_DATABASE)) {
    if (addressLower.includes(city)) {
      return {
        lat: coords.lat,
        lon: coords.lon,
        display_name: `${city} (fixe)`
      };
    }
  }
  
  // Fallback pour Ganges
  return {
    lat: 43.9333,
    lon: 3.7167,
    display_name: 'Ganges (fallback)'
  };
}

// Fonction de calcul de distance (formule de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
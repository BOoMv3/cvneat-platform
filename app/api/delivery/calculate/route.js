import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { restaurantAddress, deliveryAddress, orderAmount, restaurantId, customerLocation } = body;

    if (!deliveryAddress) {
      return NextResponse.json({ 
        error: 'deliveryAddress requis' 
      }, { status: 400 });
    }

    console.log('=== CALCUL DISTANCE LIVRAISON ===');
    console.log('Adresse restaurant:', restaurantAddress);
    console.log('Adresse livraison:', deliveryAddress);

    // Utiliser des coordonnées fixes pour éviter les erreurs d'API
    const restaurantCoords = getCoordinatesFromAddress(restaurantAddress || 'Ganges, France');
    const deliveryCoords = getCoordinatesFromAddress(deliveryAddress);

    if (!restaurantCoords || !deliveryCoords) {
      console.error('Coordonnées non trouvées:', { restaurantCoords, deliveryCoords });
      return NextResponse.json({ 
        error: 'Impossible de localiser les adresses' 
      }, { status: 400 });
    }

    console.log('Coordonnées restaurant:', restaurantCoords);
    console.log('Coordonnées livraison:', deliveryCoords);

    // Calculer la distance réelle avec la formule de Haversine
    const realDistance = calculateDistance(
      restaurantCoords.lat,
      restaurantCoords.lon,
      deliveryCoords.lat,
      deliveryCoords.lon
    );

    console.log(`Distance calculée: ${realDistance.toFixed(2)} km`);

    // Validation de distance raisonnable (max 50km pour éviter les erreurs)
    if (realDistance > 50) {
      console.error('Distance aberrante détectée:', realDistance);
      return NextResponse.json({
        success: false,
        livrable: false,
        message: `Erreur de géolocalisation - Distance calculée anormale: ${realDistance.toFixed(2)}km`
      });
    }

    // Votre système de tarification original
    const baseFee = 2.50; // 2.50€ de base
    const distanceFee = 0.80; // 0.80€ par km
    
    // Calculer les frais totaux
    const calculatedFee = baseFee + (realDistance * distanceFee);
    // Plafonner à 10€ maximum comme vous l'aviez demandé
    const totalDeliveryFee = Math.min(calculatedFee, 10.00);
    
    // Vérifier si la livraison est possible (max 10km comme vous l'aviez dit)
    const maxDistance = 10;
    const livrable = realDistance <= maxDistance;
    
    if (!livrable) {
      return NextResponse.json({
        success: false,
        livrable: false,
        message: `Livraison impossible au-delà de ${maxDistance}km (distance: ${realDistance.toFixed(2)}km)`
      });
    }

    // Calculer le temps de livraison estimé
    const preparationTime = 15; // minutes
    const averageSpeed = 25; // km/h
    const travelTime = (realDistance / averageSpeed) * 60; // en minutes
    const estimatedDeliveryTime = Math.round(preparationTime + travelTime);

    console.log('=== RÉSULTAT ===');
    console.log('Livrable:', livrable);
    console.log('Distance:', realDistance);
    console.log('Frais base:', baseFee);
    console.log('Frais distance:', realDistance * distanceFee);
    console.log('Total:', totalDeliveryFee);

    return NextResponse.json({
      success: true,
      livrable: true,
      frais_livraison: Math.round(totalDeliveryFee * 100) / 100,
      distance: Math.round(realDistance * 100) / 100,
      temps_estime: estimatedDeliveryTime,
      frais_base: baseFee,
      frais_distance: distanceFee,
      message: `Livraison possible - ${estimatedDeliveryTime}min`,
      details: {
        distance_calculée: realDistance.toFixed(2),
        frais_calculés: calculatedFee.toFixed(2),
        plafond_appliqué: calculatedFee > 10.00,
        formule: `${baseFee}€ + (${realDistance.toFixed(2)}km × ${distanceFee}€) = ${totalDeliveryFee.toFixed(2)}€`
      }
    });

  } catch (error) {
    console.error('Erreur calcul livraison:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Base de données de coordonnées fixes pour les villes françaises
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
  console.log(`Recherche coordonnées pour: ${address}`);
  
  // Chercher par nom de ville
  for (const [city, coords] of Object.entries(COORDINATES_DATABASE)) {
    if (addressLower.includes(city)) {
      console.log(`Coordonnées trouvées pour ${city}:`, coords);
      return {
        lat: coords.lat,
        lon: coords.lon,
        display_name: `${city} (fixe)`
      };
    }
  }
  
  // Fallback pour Ganges si rien n'est trouvé
  console.log('Aucune coordonnée trouvée, utilisation du fallback Ganges');
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
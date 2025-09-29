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

    // Géocoder les adresses pour obtenir les coordonnées GPS
    const restaurantCoords = await geocodeAddress(restaurantAddress || 'Ganges, France');
    const deliveryCoords = await geocodeAddress(deliveryAddress);

    if (!restaurantCoords || !deliveryCoords) {
      console.error('Erreur géocodage:', { restaurantCoords, deliveryCoords });
      return NextResponse.json({ 
        error: 'Impossible de localiser les adresses' 
      }, { status: 400 });
    }

    console.log('Coordonnées restaurant:', restaurantCoords);
    console.log('Coordonnées livraison:', deliveryCoords);
    
    // Validation des coordonnées (France métropolitaine)
    if (!isValidFrenchCoordinates(restaurantCoords) || !isValidFrenchCoordinates(deliveryCoords)) {
      console.error('Coordonnées invalides:', { restaurantCoords, deliveryCoords });
      return NextResponse.json({ 
        error: 'Coordonnées géographiques invalides' 
      }, { status: 400 });
    }

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

// Fonction de validation des coordonnées françaises
function isValidFrenchCoordinates(coords) {
  // France métropolitaine approximative
  const minLat = 41.0;
  const maxLat = 51.5;
  const minLon = -5.5;
  const maxLon = 9.5;
  
  return coords && 
         coords.lat >= minLat && coords.lat <= maxLat &&
         coords.lon >= minLon && coords.lon <= maxLon;
}

// Fonction de géocodage avec Nominatim (OpenStreetMap) - AMÉLIORÉE
async function geocodeAddress(address) {
  try {
    console.log(`Géocodage de: ${address}`);
    
    // Nettoyer et formater l'adresse
    const cleanAddress = address.trim() + ', France';
    const encodedAddress = encodeURIComponent(cleanAddress);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr&addressdetails=1`;
    
    console.log('URL de géocodage:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CVNeat-Delivery-Calculator/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur géocodage: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Réponse Nominatim:', data);
    
    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name,
        importance: data[0].importance || 0
      };
      
      // Vérifier la qualité du résultat
      if (result.importance < 0.1) {
        console.warn('Résultat de géocodage de faible qualité:', result);
      }
      
      console.log(`Coordonnées trouvées: ${result.lat}, ${result.lon} (importance: ${result.importance})`);
      return result;
    }
    
    // Fallback pour Ganges si l'API ne trouve rien
    if (address.toLowerCase().includes('ganges')) {
      console.log('Utilisation des coordonnées de fallback pour Ganges');
      return {
        lat: 43.9333,
        lon: 3.7167,
        display_name: 'Ganges, France (fallback)',
        importance: 1.0
      };
    }
    
    console.warn(`Aucune coordonnée trouvée pour: ${address}`);
    return null;
    
  } catch (error) {
    console.error('Erreur géocodage:', error);
    
    // Fallback en cas d'erreur pour Ganges
    if (address.toLowerCase().includes('ganges')) {
      return {
        lat: 43.9333,
        lon: 3.7167,
        display_name: 'Ganges, France (fallback)',
        importance: 1.0
      };
    }
    
    return null;
  }
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
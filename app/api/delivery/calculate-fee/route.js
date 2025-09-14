import { NextResponse } from 'next/server';

// Fonction pour calculer la distance entre deux points (formule de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// Fonction pour obtenir les coordonnées d'une adresse (géocodage simple)
async function getCoordinatesFromAddress(address) {
  try {
    // Pour une vraie implémentation, utilisez Google Maps API ou OpenStreetMap
    // Ici on simule avec des coordonnées par défaut pour Paris
    const defaultCoords = {
      latitude: 48.8566,
      longitude: 2.3522
    };
    
    // Simulation basée sur l'adresse
    if (address.toLowerCase().includes('paris')) {
      return defaultCoords;
    }
    
    // Pour d'autres villes, on pourrait avoir une base de données
    return defaultCoords;
  } catch (error) {
    console.error('Erreur de géocodage:', error);
    return null;
  }
}

export async function POST(request) {
  try {
    const { 
      restaurantAddress, 
      deliveryAddress, 
      restaurantCoordinates,
      deliveryCoordinates,
      orderAmount 
    } = await request.json();

    if (!restaurantAddress && !restaurantCoordinates) {
      return NextResponse.json({ 
        error: 'Adresse du restaurant requise' 
      }, { status: 400 });
    }

    if (!deliveryAddress && !deliveryCoordinates) {
      return NextResponse.json({ 
        error: 'Adresse de livraison requise' 
      }, { status: 400 });
    }

    let restaurantCoords = restaurantCoordinates;
    let deliveryCoords = deliveryCoordinates;

    // Si on n'a pas les coordonnées, essayer de les obtenir
    if (!restaurantCoords && restaurantAddress) {
      restaurantCoords = await getCoordinatesFromAddress(restaurantAddress);
    }

    if (!deliveryCoords && deliveryAddress) {
      deliveryCoords = await getCoordinatesFromAddress(deliveryAddress);
    }

    if (!restaurantCoords || !deliveryCoords) {
      return NextResponse.json({ 
        error: 'Impossible de déterminer les coordonnées' 
      }, { status: 400 });
    }

    // Calculer la distance
    const distance = calculateDistance(
      restaurantCoords.latitude,
      restaurantCoords.longitude,
      deliveryCoords.latitude,
      deliveryCoords.longitude
    );

    // Calculer les frais de livraison
    let deliveryFee = 2.50; // Frais de base

    // Augmenter les frais selon la distance
    if (distance > 5) {
      deliveryFee += (distance - 5) * 0.5; // +0.50€ par km au-delà de 5km
    }

    // Frais maximum
    deliveryFee = Math.min(deliveryFee, 10.00);

    // Réduction pour les commandes importantes
    if (orderAmount && orderAmount >= 25) {
      deliveryFee *= 0.8; // 20% de réduction
    }

    // Livraison gratuite pour les commandes importantes
    const isFreeDelivery = orderAmount && orderAmount >= 50;

    // Vérifier si la livraison est possible
    const isDeliverable = distance <= 15; // Zone de livraison de 15km max

    return NextResponse.json({
      distance: Math.round(distance * 10) / 10,
      deliveryFee: isFreeDelivery ? 0 : Math.round(deliveryFee * 100) / 100,
      isDeliverable,
      isFreeDelivery,
      estimatedTime: Math.round(distance * 3 + 15), // Estimation basée sur la distance
      restaurantCoordinates: restaurantCoords,
      deliveryCoordinates: deliveryCoords
    });

  } catch (error) {
    console.error('Erreur lors du calcul des frais de livraison:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur' 
    }, { status: 500 });
  }
}

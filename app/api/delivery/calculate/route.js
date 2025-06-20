import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { restaurantLocation, deliveryAddress, orderAmount } = await request.json();

    if (!restaurantLocation || !deliveryAddress) {
      return NextResponse.json(
        { error: 'Localisation requise' },
        { status: 400 }
      );
    }

    // Calculer la distance (formule de Haversine simplifiée)
    const distance = calculateDistance(
      restaurantLocation.lat,
      restaurantLocation.lng,
      deliveryAddress.lat,
      deliveryAddress.lng
    );

    // Calculer les frais de livraison
    let deliveryFee = 0;
    let estimatedTime = 0;

    if (distance <= 2) {
      deliveryFee = 2.50;
      estimatedTime = 20; // minutes
    } else if (distance <= 5) {
      deliveryFee = 4.00;
      estimatedTime = 30;
    } else if (distance <= 10) {
      deliveryFee = 6.00;
      estimatedTime = 45;
    } else {
      deliveryFee = 8.00;
      estimatedTime = 60;
    }

    // Réduction si commande importante
    if (orderAmount >= 30) {
      deliveryFee = Math.max(0, deliveryFee - 1);
    }

    return NextResponse.json({
      distance: Math.round(distance * 10) / 10, // km avec 1 décimale
      deliveryFee,
      estimatedTime,
      totalAmount: orderAmount + deliveryFee
    });
  } catch (error) {
    console.error('Erreur lors du calcul de livraison:', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul de livraison' },
      { status: 500 }
    );
  }
}

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
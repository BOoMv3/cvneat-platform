import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { restaurantId, deliveryAddress, customerLocation } = body;

    if (!restaurantId || !deliveryAddress || !customerLocation) {
      return NextResponse.json({ 
        error: 'restaurantId, deliveryAddress et customerLocation requis' 
      }, { status: 400 });
    }

    // Récupérer les informations du restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Récupérer les zones de livraison du restaurant
    const { data: deliveryZones, error: zonesError } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (zonesError) {
      console.error('Erreur récupération zones:', zonesError);
    }

    // Calculer la distance entre le restaurant et le client
    const distance = calculateDistance(
      restaurant.latitude || 0,
      restaurant.longitude || 0,
      customerLocation.lat || 0,
      customerLocation.lng || 0
    );

    // Déterminer la zone de livraison
    let deliveryZone = null;
    let baseFee = 0;
    let distanceFee = 0;

    if (deliveryZones && deliveryZones.length > 0) {
      // Trouver la zone qui correspond à la distance
      deliveryZone = deliveryZones.find(zone => 
        distance <= (zone.max_distance || Infinity)
      );
      
      if (deliveryZone) {
        baseFee = deliveryZone.base_fee || 0;
        distanceFee = deliveryZone.distance_fee || 0;
      }
    } else {
      // Tarification par défaut si pas de zones définies
      baseFee = 2.50; // Frais de base
      distanceFee = 0.50; // 0.50€ par km
    }

    // Calculer les frais totaux
    const totalDeliveryFee = baseFee + (distance * distanceFee);
    
    // Vérifier si le restaurant est ouvert
    const isOpen = checkRestaurantHours(restaurant.horaires);
    
    if (!isOpen) {
      return NextResponse.json({
        error: 'Le restaurant est actuellement fermé',
        isOpen: false
      }, { status: 400 });
    }

    // Calculer le temps de livraison estimé
    const estimatedDeliveryTime = calculateDeliveryTime(distance, restaurant.preparation_time || 15);

    return NextResponse.json({
      success: true,
      deliveryFee: Math.round(totalDeliveryFee * 100) / 100, // Arrondir à 2 décimales
      distance: Math.round(distance * 100) / 100, // Distance en km
      estimatedTime: estimatedDeliveryTime, // Temps en minutes
      baseFee: baseFee,
      distanceFee: distanceFee,
      isOpen: true,
      zone: deliveryZone?.name || 'Zone par défaut'
    });

  } catch (error) {
    console.error('Erreur calcul livraison:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
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

// Fonction de vérification des horaires
function checkRestaurantHours(horaires) {
  if (!horaires) return true; // Si pas d'horaires définis, considérer comme ouvert
  
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  
  const todayHours = horaires[currentDay];
  if (!todayHours || !todayHours.ouvert) return false;
  
  return currentTime >= todayHours.ouverture && currentTime <= todayHours.fermeture;
}

// Fonction de calcul du temps de livraison
function calculateDeliveryTime(distance, preparationTime) {
  const averageSpeed = 20; // km/h en ville
  const travelTime = (distance / averageSpeed) * 60; // en minutes
  return Math.round(preparationTime + travelTime);
} 
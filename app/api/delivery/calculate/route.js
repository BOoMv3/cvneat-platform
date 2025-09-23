import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { restaurantAddress, deliveryAddress, orderAmount, restaurantId, customerLocation } = body;

    // Support des deux formats de paramètres
    if (!deliveryAddress) {
      return NextResponse.json({ 
        error: 'deliveryAddress requis' 
      }, { status: 400 });
    }

    // Pour l'instant, utiliser une logique simplifiée basée sur l'adresse
    // TODO: Implémenter la géolocalisation et les zones de livraison
    
    // Calcul simple basé sur la distance estimée (en km)
    let estimatedDistance = 2; // Distance par défaut
    
    // Logique simple pour Ganges et environs
    if (deliveryAddress.toLowerCase().includes('ganges')) {
      estimatedDistance = 1;
    } else if (deliveryAddress.toLowerCase().includes('sumène')) {
      estimatedDistance = 3;
    } else if (deliveryAddress.toLowerCase().includes('saint-bauzille')) {
      estimatedDistance = 4;
    } else {
      estimatedDistance = 5; // Distance maximale
    }

    // Tarification simplifiée
    const baseFee = 2.50; // Frais de base
    const distanceFee = 0.50; // 0.50€ par km
    
    // Calculer les frais totaux
    const totalDeliveryFee = baseFee + (estimatedDistance * distanceFee);
    
    // Vérifier si la livraison est possible (distance max 10km)
    const maxDistance = 10;
    const livrable = estimatedDistance <= maxDistance;
    
    if (!livrable) {
      return NextResponse.json({
        success: false,
        livrable: false,
        message: `Livraison impossible au-delà de ${maxDistance}km`
      });
    }

    // Calculer le temps de livraison estimé
    const preparationTime = 15; // minutes
    const averageSpeed = 20; // km/h
    const travelTime = (estimatedDistance / averageSpeed) * 60; // en minutes
    const estimatedDeliveryTime = Math.round(preparationTime + travelTime);

    return NextResponse.json({
      success: true,
      livrable: true,
      frais_livraison: Math.round(totalDeliveryFee * 100) / 100, // Arrondir à 2 décimales
      distance: Math.round(estimatedDistance * 100) / 100, // Distance en km
      temps_estime: estimatedDeliveryTime, // Temps en minutes
      frais_base: baseFee,
      frais_distance: distanceFee,
      message: `Livraison possible - ${estimatedDeliveryTime}min`
    });

  } catch (error) {
    console.error('Erreur calcul livraison:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// TODO: Implémenter les fonctions avancées :
// - calculateDistance() avec géolocalisation réelle
// - checkRestaurantHours() avec horaires dynamiques
// - Zones de livraison personnalisées par restaurant 
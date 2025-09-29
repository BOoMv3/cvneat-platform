import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { deliveryAddress, orderAmount } = body;

    if (!deliveryAddress) {
      return NextResponse.json({ 
        error: 'deliveryAddress requis' 
      }, { status: 400 });
    }

    console.log('=== CALCUL LIVRAISON SIMPLIFIÉ ===');
    console.log('Adresse de livraison:', deliveryAddress);

    // Extraire le code postal de l'adresse
    const postalCode = extractPostalCode(deliveryAddress);
    console.log('Code postal extrait:', postalCode);

    if (!postalCode) {
      return NextResponse.json({
        success: false,
        livrable: false,
        message: 'Code postal non trouvé dans l\'adresse'
      });
    }

    // Calculer la distance basée sur le code postal
    const distance = calculateDistanceFromPostalCode(postalCode);
    console.log('Distance calculée:', distance);

    // Vérifier si la livraison est possible
    const maxDistance = 10; // 10km maximum
    const livrable = distance <= maxDistance;

    if (!livrable) {
      return NextResponse.json({
        success: false,
        livrable: false,
        message: `Livraison impossible au-delà de ${maxDistance}km (distance: ${distance.toFixed(2)}km)`
      });
    }

    // Calculer les frais de livraison
    const baseFee = 2.50; // Frais de base
    const distanceFee = 0.80; // 0.80€ par km
    const calculatedFee = baseFee + (distance * distanceFee);
    const totalDeliveryFee = Math.min(calculatedFee, 10.00); // Plafond 10€

    // Calculer le temps de livraison estimé
    const preparationTime = 15; // minutes
    const averageSpeed = 25; // km/h
    const travelTime = (distance / averageSpeed) * 60; // en minutes
    const estimatedDeliveryTime = Math.round(preparationTime + travelTime);

    console.log('=== RÉSULTAT ===');
    console.log('Livrable:', livrable);
    console.log('Distance:', distance);
    console.log('Frais:', totalDeliveryFee);
    console.log('Temps estimé:', estimatedDeliveryTime);

    return NextResponse.json({
      success: true,
      livrable: true,
      frais_livraison: Math.round(totalDeliveryFee * 100) / 100,
      distance: Math.round(distance * 100) / 100,
      temps_estime: estimatedDeliveryTime,
      frais_base: baseFee,
      frais_distance: distanceFee,
      message: `Livraison possible - ${estimatedDeliveryTime}min`,
      details: {
        code_postal: postalCode,
        distance_calculée: distance.toFixed(2),
        frais_calculés: calculatedFee.toFixed(2),
        plafond_appliqué: calculatedFee > 10.00
      }
    });

  } catch (error) {
    console.error('Erreur calcul livraison:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Extraire le code postal d'une adresse française
function extractPostalCode(address) {
  // Rechercher un code postal français (5 chiffres)
  const postalCodeMatch = address.match(/\b(\d{5})\b/);
  return postalCodeMatch ? postalCodeMatch[1] : null;
}

// Calculer la distance basée sur le code postal
function calculateDistanceFromPostalCode(postalCode) {
  // Codes postaux de référence pour Ganges et environs
  const referencePostalCodes = {
    '34190': 0, // Ganges - centre de livraison
    '34150': 5, // Gignac
    '34160': 8, // Castries
    '34000': 15, // Montpellier
    '34070': 12, // Montpellier
    '34080': 10, // Montpellier
    '34090': 8, // Montpellier
    '34790': 6, // Grabels
    '34820': 4, // Teyran
    '34830': 3, // Jacou
    '34880': 2, // Lavérune
  };

  // Si on a une distance connue, l'utiliser
  if (referencePostalCodes[postalCode] !== undefined) {
    return referencePostalCodes[postalCode];
  }

  // Pour les autres codes postaux, estimer la distance
  const firstTwoDigits = postalCode.substring(0, 2);
  
  // Hérault (34) - distances estimées
  if (firstTwoDigits === '34') {
    return 5; // Distance moyenne dans l'Hérault
  }
  
  // Gard (30) - distances estimées
  if (firstTwoDigits === '30') {
    return 8; // Distance moyenne depuis Ganges
  }
  
  // Aude (11) - distances estimées
  if (firstTwoDigits === '11') {
    return 12; // Distance moyenne depuis Ganges
  }
  
  // Autres départements - distance par défaut
  return 15; // Distance par défaut pour les autres départements
}
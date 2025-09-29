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

    // Extraire le code postal
    const postalCode = extractPostalCode(deliveryAddress);
    
    if (!postalCode) {
      return NextResponse.json({
        success: false,
        livrable: false,
        message: 'Code postal non trouvé'
      });
    }

    // Calculer la distance
    const distance = calculateDistanceFromPostalCode(postalCode);
    
    // Vérifier si livrable (max 10km)
    const livrable = distance <= 10;
    
    if (!livrable) {
      return NextResponse.json({
        success: false,
        livrable: false,
        message: `Livraison impossible au-delà de 10km (distance: ${distance.toFixed(2)}km)`
      });
    }

    // Calculer les frais
    let deliveryFee = 2.50; // Frais de base

    // Augmenter selon la distance
    if (distance > 5) {
      deliveryFee += (distance - 5) * 0.80; // +0.80€ par km au-delà de 5km
    }

    // Plafond à 10€
    deliveryFee = Math.min(deliveryFee, 10.00);

    // Réduction pour commandes importantes
    if (orderAmount && orderAmount >= 25) {
      deliveryFee *= 0.8; // 20% de réduction
    }

    // Livraison gratuite pour commandes >= 50€
    const isFreeDelivery = orderAmount && orderAmount >= 50;

    console.log('=== RÉSULTAT FRAIS ===');
    console.log('Distance:', distance);
    console.log('Frais calculés:', deliveryFee);
    console.log('Livraison gratuite:', isFreeDelivery);

    return NextResponse.json({
      success: true,
      livrable: true,
      deliveryFee: isFreeDelivery ? 0 : Math.round(deliveryFee * 100) / 100,
      distance: Math.round(distance * 100) / 100,
      isFreeDelivery,
      details: {
        code_postal: postalCode,
        distance_calculée: distance.toFixed(2),
        frais_brut: deliveryFee.toFixed(2),
        reduction_appliquee: orderAmount >= 25,
        livraison_gratuite: isFreeDelivery
      }
    });

  } catch (error) {
    console.error('Erreur calcul frais:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Extraire le code postal d'une adresse française
function extractPostalCode(address) {
  const postalCodeMatch = address.match(/\b(\d{5})\b/);
  return postalCodeMatch ? postalCodeMatch[1] : null;
}

// Calculer la distance basée sur le code postal
function calculateDistanceFromPostalCode(postalCode) {
  // Codes postaux de référence pour Ganges et environs
  const referencePostalCodes = {
    '34190': 0, // Ganges - centre
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

  if (referencePostalCodes[postalCode] !== undefined) {
    return referencePostalCodes[postalCode];
  }

  // Estimation basée sur les 2 premiers chiffres
  const firstTwoDigits = postalCode.substring(0, 2);
  
  if (firstTwoDigits === '34') return 5; // Hérault
  if (firstTwoDigits === '30') return 8; // Gard
  if (firstTwoDigits === '11') return 12; // Aude
  
  return 15; // Autres départements
}
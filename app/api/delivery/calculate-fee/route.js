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

    // Géocoder l'adresse pour obtenir la distance
    const deliveryCoords = await geocodeAddress(deliveryAddress);
    
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

// Fonction de géocodage (même que dans calculate)
async function geocodeAddress(address) {
  try {
    console.log(`Géocodage de: ${address}`);
    
    const cleanAddress = address.trim() + ', France';
    const encodedAddress = encodeURIComponent(cleanAddress);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CVNeat-Delivery-Calculator/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur géocodage: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }
    
    // Fallback pour Ganges
    if (address.toLowerCase().includes('ganges')) {
      return {
        lat: 43.9333,
        lon: 3.7167,
        display_name: 'Ganges, France (fallback)'
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('Erreur géocodage:', error);
    
    // Fallback pour Ganges
    if (address.toLowerCase().includes('ganges')) {
      return {
        lat: 43.9333,
        lon: 3.7167,
        display_name: 'Ganges, France (fallback)'
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
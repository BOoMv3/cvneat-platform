import { NextResponse } from 'next/server';

// Villes et villages desservis avec leurs coordonnées approximatives
const VILLES_DESSERVIES = {
  // Villages très proches de Ganges (0-10 minutes de route)
  'ganges': { lat: 43.9333, lng: 3.7167, basePrice: 2.50 },
  'cazilhac': { lat: 43.9167, lng: 3.7000, basePrice: 3.00 },
  'laroque': { lat: 43.9167, lng: 3.7167, basePrice: 3.00 },
  'brissac': { lat: 43.8833, lng: 3.7000, basePrice: 3.50 },
  'moulès-et-baucels': { lat: 43.9500, lng: 3.7333, basePrice: 3.00 },
  'saint-bauzille-de-putois': { lat: 43.9000, lng: 3.7333, basePrice: 4.00 },
  'saint-laurent-le-minier': { lat: 43.9333, lng: 3.6500, basePrice: 3.50 },
  'saint-andré-de-majencoules': { lat: 43.9500, lng: 3.6500, basePrice: 4.00 },
  'sumène': { lat: 43.9833, lng: 3.7167, basePrice: 4.50 },
  'saint-hippolyte-du-fort': { lat: 43.9667, lng: 3.8500, basePrice: 5.00 },
  'saint-roman-de-codières': { lat: 43.9667, lng: 3.6500, basePrice: 4.50 },
  'saint-félix-de-pallières': { lat: 43.9500, lng: 3.8000, basePrice: 5.00 }
};

// Limite de livraison en km (réduite pour se concentrer sur les villages très proches)
const LIMITE_LIVRAISON_KM = 12;

// Calculer la distance entre deux points (formule de Haversine)
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

// Détecter la ville à partir d'une adresse
function detectCityFromAddress(address) {
  const addressLower = address.toLowerCase();
  
  for (const [city, data] of Object.entries(VILLES_DESSERVIES)) {
    if (addressLower.includes(city) || addressLower.includes(city.replace('-', ' '))) {
      return { city, ...data };
    }
  }
  
  // Si aucune ville n'est trouvée, on utilise Ganges par défaut
  return { city: 'ganges', ...VILLES_DESSERVIES.ganges };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      restaurantAddress, 
      deliveryAddress, 
      orderAmount = 0 
    } = body;

    if (!restaurantAddress || !deliveryAddress) {
      return NextResponse.json(
        { error: 'Adresses requises' },
        { status: 400 }
      );
    }

    // Détecter les villes
    const restaurantCity = detectCityFromAddress(restaurantAddress);
    const deliveryCity = detectCityFromAddress(deliveryAddress);

    // Calculer la distance
    const distance = calculateDistance(
      restaurantCity.lat,
      restaurantCity.lng,
      deliveryCity.lat,
      deliveryCity.lng
    );

    // Vérifier si la livraison est possible
    if (distance > LIMITE_LIVRAISON_KM) {
      return NextResponse.json({
        livrable: false,
        message: `Livraison impossible : distance de ${distance.toFixed(1)}km dépasse la limite de ${LIMITE_LIVRAISON_KM}km`,
        distance: distance.toFixed(1),
        limite: LIMITE_LIVRAISON_KM
      });
    }

    // Calculer les frais de livraison
    let fraisLivraison = deliveryCity.basePrice;

    // Ajuster selon la distance (supplément pour distances plus importantes)
    if (distance > 8) {
      fraisLivraison += Math.ceil((distance - 8) / 2) * 0.50; // +0.50€ tous les 2km après 8km
    }

    // Ajuster selon le montant de la commande (suppression de la livraison gratuite)
    if (orderAmount >= 30) {
      fraisLivraison = Math.max(fraisLivraison - 0.50, deliveryCity.basePrice); // Réduction de 0.50€ max pour commandes importantes
    } else if (orderAmount < 15) {
      fraisLivraison += 1; // Supplément pour petites commandes
    }

    // Arrondir à 2 décimales
    fraisLivraison = Math.round(fraisLivraison * 100) / 100;

    return NextResponse.json({
      livrable: true,
      frais_livraison: fraisLivraison,
      distance: distance.toFixed(1),
      ville_restaurant: restaurantCity.city,
      ville_livraison: deliveryCity.city,
      details: {
        prix_de_base: deliveryCity.basePrice,
        distance_km: distance.toFixed(1),
        reduction_commande: orderAmount >= 30 ? 'Oui' : 'Non',
        supplement_petite_commande: orderAmount < 15 ? 'Oui' : 'Non'
      }
    });

  } catch (error) {
    console.error('Erreur calcul frais livraison:', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul des frais de livraison' },
      { status: 500 }
    );
  }
}

// Endpoint pour obtenir les villes desservies
export async function GET() {
  return NextResponse.json({
    villes_desservies: Object.keys(VILLES_DESSERVIES).map(city => ({
      nom: city.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      code: city,
      prix_base: VILLES_DESSERVIES[city].basePrice
    })),
    limite_km: LIMITE_LIVRAISON_KM
  });
} 
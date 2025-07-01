import { NextResponse } from 'next/server';

// Villes et villages desservis avec leurs coordonnées approximatives
// Prix de base : 2.50€ pour Ganges, augmentation selon distance et coût essence
const VILLES_DESSERVIES = {
  // Ganges (centre)
  'ganges': { lat: 43.9333, lng: 3.7167, distanceFromGanges: 0 },
  
  // Villages très proches de Ganges (0-10 minutes de route)
  'cazilhac': { lat: 43.9167, lng: 3.7000, distanceFromGanges: 2.5 },
  'laroque': { lat: 43.9167, lng: 3.7167, distanceFromGanges: 2.0 },
  'brissac': { lat: 43.8833, lng: 3.7000, distanceFromGanges: 4.0 },
  'moulès-et-baucels': { lat: 43.9500, lng: 3.7333, distanceFromGanges: 3.0 },
  'saint-bauzille-de-putois': { lat: 43.9000, lng: 3.7333, distanceFromGanges: 5.0 },
  'saint-laurent-le-minier': { lat: 43.9333, lng: 3.6500, distanceFromGanges: 6.0 },
  'saint-andré-de-majencoules': { lat: 43.9500, lng: 3.6500, distanceFromGanges: 7.0 },
  'sumène': { lat: 43.9833, lng: 3.7167, distanceFromGanges: 8.0 },
  'saint-hippolyte-du-fort': { lat: 43.9667, lng: 3.8500, distanceFromGanges: 12.0 },
  'saint-roman-de-codières': { lat: 43.9667, lng: 3.6500, distanceFromGanges: 9.0 },
  'saint-félix-de-pallières': { lat: 43.9500, lng: 3.8000, distanceFromGanges: 10.0 }
};

// Prix de base pour Ganges (corrigé)
const PRIX_BASE_GANGES = 2.50;

// Coût de l'essence par km (augmenté - prix actuel ~2.00€/L et consommation ~7L/100km)
const COUT_ESSENCE_PAR_KM = 0.14; // ~2.00€/L * 7L/100km

// Limite de livraison en km
const LIMITE_LIVRAISON_KM = 15;

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

// Calculer les frais de livraison basés sur la distance et le coût de l'essence
function calculateDeliveryFee(distanceFromGanges, orderAmount = 0) {
  // Prix de base pour Ganges
  let fraisLivraison = PRIX_BASE_GANGES;
  
  // Ajouter le coût de l'essence pour la distance (aller-retour)
  const coutEssence = distanceFromGanges * COUT_ESSENCE_PAR_KM * 2; // Aller-retour
  fraisLivraison += coutEssence;
  
  // Ajouter un supplément pour la distance (usure véhicule, temps, main d'œuvre)
  if (distanceFromGanges > 3) {
    fraisLivraison += Math.ceil((distanceFromGanges - 3) / 2) * 0.75; // +0.75€ tous les 2km après 3km
  }
  
  // Supplément pour temps de livraison (plus c'est loin, plus ça prend du temps)
  if (distanceFromGanges > 5) {
    fraisLivraison += Math.ceil((distanceFromGanges - 5) / 3) * 1.00; // +1.00€ tous les 3km après 5km
  }
  
  // Ajuster selon le montant de la commande
  if (orderAmount >= 40) {
    fraisLivraison = Math.max(fraisLivraison - 1.00, PRIX_BASE_GANGES); // Réduction de 1.00€ max
  } else if (orderAmount < 20) {
    fraisLivraison += 1.50; // Supplément pour petites commandes
  }
  
  // Arrondir à 2 décimales
  return Math.round(fraisLivraison * 100) / 100;
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

    // Calculer la distance réelle
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

    // Calculer les frais de livraison basés sur la distance depuis Ganges
    const fraisLivraison = calculateDeliveryFee(deliveryCity.distanceFromGanges, orderAmount);

    return NextResponse.json({
      livrable: true,
      frais_livraison: fraisLivraison,
      distance: distance.toFixed(1),
      ville_restaurant: restaurantCity.city,
      ville_livraison: deliveryCity.city,
      details: {
        prix_de_base: PRIX_BASE_GANGES,
        distance_depuis_ganges: deliveryCity.distanceFromGanges.toFixed(1) + 'km',
        cout_essence_ar: (deliveryCity.distanceFromGanges * COUT_ESSENCE_PAR_KM * 2).toFixed(2) + '€',
        reduction_commande: orderAmount >= 40 ? 'Oui (-1.00€)' : 'Non',
        supplement_petite_commande: orderAmount < 20 ? 'Oui (+1.50€)' : 'Non'
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
    villes_desservies: Object.entries(VILLES_DESSERVIES).map(([city, data]) => ({
      nom: city.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      code: city,
      distance_depuis_ganges: data.distanceFromGanges + 'km',
      frais_estime: calculateDeliveryFee(data.distanceFromGanges)
    })),
    limite_km: LIMITE_LIVRAISON_KM,
    prix_base_ganges: PRIX_BASE_GANGES,
    cout_essence_par_km: COUT_ESSENCE_PAR_KM
  });
} 
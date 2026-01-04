const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Fonction pour calculer la distance (Haversine)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function trouverCommandesDistanceProbleme() {
  console.log('🔍 Recherche de toutes les commandes récentes avec distance > 10km...\n');

  // Récupérer les commandes des 7 derniers jours
  const maintenant = new Date();
  const ilYa7Jours = new Date(maintenant);
  ilYa7Jours.setDate(ilYa7Jours.getDate() - 7);

  console.log(`📅 Période: ${ilYa7Jours.toLocaleString('fr-FR')} à ${maintenant.toLocaleString('fr-FR')}\n`);

  // Coordonnées par défaut de Ganges
  const DEFAULT_RESTAURANT = {
    lat: 43.9342,
    lng: 3.7098
  };

  const { data: commandes, error } = await supabaseAdmin
    .from('commandes')
    .select(`
      id,
      created_at,
      adresse_livraison,
      ville_livraison,
      frais_livraison,
      restaurant_id,
      statut,
      payment_status,
      restaurants (
        id,
        nom,
        adresse,
        code_postal,
        ville
      )
    `)
    .gte('created_at', ilYa7Jours.toISOString())
    .lte('created_at', maintenant.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`📦 ${commandes.length} commandes trouvées\n`);

  const commandesProblemes = [];

  for (const commande of commandes) {
    // Vérifier si l'ID commence par b133dfd3 ou 1813a2f9
    const idShort = commande.id.slice(0, 8);
    const isTargetCommande = idShort === 'b133dfd3' || idShort === '1813a2f9';
    
    const restaurant = commande.restaurants;
    if (!restaurant) continue;

    // Coordonnées restaurant
    let restaurantLat = DEFAULT_RESTAURANT.lat;
    let restaurantLng = DEFAULT_RESTAURANT.lng;

    if (restaurant.ville?.toLowerCase().includes('ganges') || restaurant.code_postal === '34190') {
      restaurantLat = DEFAULT_RESTAURANT.lat;
      restaurantLng = DEFAULT_RESTAURANT.lng;
    } else if (restaurant.adresse) {
      // Géocoder si pas à Ganges
      try {
        const restaurantAddress = `${restaurant.adresse}, ${restaurant.code_postal || ''} ${restaurant.ville || ''}, France`;
        const encodedAddress = encodeURIComponent(restaurantAddress);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr`;
        
        const response = await fetch(url, {
          headers: { 'User-Agent': 'CVNeat-Delivery/1.0' }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            restaurantLat = parseFloat(data[0].lat);
            restaurantLng = parseFloat(data[0].lon);
          }
        }
      } catch (error) {
        // Ignorer les erreurs de géocodage
      }
    }

    // Géocoder adresse client
    const adresseLivraison = commande.adresse_livraison || '';
    if (!adresseLivraison) continue;

    try {
      const encodedAddress = encodeURIComponent(`${adresseLivraison}, France`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr`;
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'CVNeat-Delivery/1.0' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const clientLat = parseFloat(data[0].lat);
          const clientLng = parseFloat(data[0].lon);
          const distance = calculateDistance(restaurantLat, restaurantLng, clientLat, clientLng);
          const roundedDistance = Math.round(distance * 10) / 10;

          // Si distance > 10km OU si c'est une des commandes ciblées
          if (roundedDistance > 10 || isTargetCommande) {
            commandesProblemes.push({
              commande: commande,
              restaurant: restaurant,
              distance: roundedDistance,
              clientCoords: { lat: clientLat, lng: clientLng },
              restaurantCoords: { lat: restaurantLat, lng: restaurantLng }
            });
          }
        }
      }
    } catch (error) {
      // Ignorer les erreurs
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`🚨 ${commandesProblemes.length} COMMANDE(S) PROBLÉMATIQUE(S)`);
  console.log('='.repeat(80) + '\n');

  for (const cmd of commandesProblemes) {
    const idShort = cmd.commande.id.slice(0, 8);
    console.log(`📦 Commande #${idShort}`);
    console.log(`   ID complet: ${cmd.commande.id}`);
    console.log(`   Date: ${new Date(cmd.commande.created_at).toLocaleString('fr-FR')}`);
    console.log(`   Restaurant: ${cmd.restaurant.nom} (${cmd.restaurant.ville || 'N/A'})`);
    console.log(`   Coordonnées restaurant: ${cmd.restaurantCoords.lat.toFixed(6)}, ${cmd.restaurantCoords.lng.toFixed(6)}`);
    console.log(`   Adresse livraison: ${cmd.commande.adresse_livraison}`);
    console.log(`   Coordonnées client: ${cmd.clientCoords.lat.toFixed(6)}, ${cmd.clientCoords.lng.toFixed(6)}`);
    console.log(`   ⚠️ DISTANCE: ${cmd.distance.toFixed(1)}km ${cmd.distance > 10 ? '(DÉPASSE 10KM !)' : ''}`);
    console.log(`   Frais livraison: ${cmd.commande.frais_livraison}€`);
    console.log(`   Statut: ${cmd.commande.statut}`);
    console.log('');
  }
}

trouverCommandesDistanceProbleme();


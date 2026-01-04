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

async function verifierCommandesDistance() {
  console.log('🔍 Vérification des commandes avec distance > 20km...\n');

  try {
    // Récupérer les commandes des 2 derniers jours (hier et aujourd'hui)
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const hier = new Date(aujourdhui);
    hier.setDate(hier.getDate() - 1); // Hier à 00:00
    const maintenant = new Date();

    console.log(`📅 Période: ${hier.toISOString()} à ${maintenant.toISOString()}\n`);

    // Récupérer toutes les commandes d'aujourd'hui avec restaurant
    const { data: commandes, error: commandesError } = await supabaseAdmin
      .from('commandes')
      .select(`
        id,
        created_at,
        adresse_livraison,
        ville_livraison,
        frais_livraison,
        restaurant_id,
        restaurants (
          id,
          nom,
          adresse,
          code_postal,
          ville
        )
      `)
      .gte('created_at', hier.toISOString())
      .lte('created_at', maintenant.toISOString())
      .order('created_at', { ascending: false });

    if (commandesError) {
      console.error('❌ Erreur récupération commandes:', commandesError);
      return;
    }

    console.log(`📦 ${commandes.length} commandes trouvées (2 derniers jours)\n`);

    // Coordonnées par défaut de Ganges (si restaurant n'a pas de coordonnées)
    const DEFAULT_RESTAURANT = {
      lat: 43.9342,
      lng: 3.7098
    };

    const commandesProblemes = [];

    for (const commande of commandes) {
      const restaurant = commande.restaurants;
      if (!restaurant) {
        console.log(`⚠️ Commande ${commande.id.slice(0, 8)} - Restaurant non trouvé`);
        continue;
      }

      // Récupérer les coordonnées du restaurant
      // Les restaurants n'ont pas de colonnes latitude/longitude dans la table
      // On utilise les coordonnées par défaut selon la ville ou code postal
      let restaurantLat = null;
      let restaurantLng = null;

      // Utiliser les coordonnées par défaut de Ganges pour tous les restaurants de Ganges
      if (restaurant.ville?.toLowerCase().includes('ganges') || restaurant.code_postal === '34190') {
        restaurantLat = DEFAULT_RESTAURANT.lat;
        restaurantLng = DEFAULT_RESTAURANT.lng;
        console.log(`📍 Restaurant ${restaurant.nom} - Utilisation coordonnées par défaut Ganges`);
      } else {
        // Pour les autres restaurants, utiliser aussi les coordonnées par défaut pour l'instant
        // (peut être amélioré avec un mapping ville -> coordonnées)
        restaurantLat = DEFAULT_RESTAURANT.lat;
        restaurantLng = DEFAULT_RESTAURANT.lng;
        console.log(`📍 Restaurant ${restaurant.nom} - Utilisation coordonnées par défaut (${restaurant.ville || 'ville inconnue'})`);
      }

      if (!restaurantLat || !restaurantLng) {
        console.log(`⚠️ Commande ${commande.id.slice(0, 8)} - Pas de coordonnées restaurant pour ${restaurant.nom}`);
        continue;
      }

      // Géocoder l'adresse de livraison
      const adresseLivraison = commande.adresse_livraison || '';
      if (!adresseLivraison) {
        console.log(`⚠️ Commande ${commande.id.slice(0, 8)} - Pas d'adresse de livraison`);
        continue;
      }

      // Essayer de géocoder l'adresse
      try {
        const encodedAddress = encodeURIComponent(`${adresseLivraison}, France`);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'CVNeat-Delivery/1.0'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const clientLat = parseFloat(data[0].lat);
            const clientLng = parseFloat(data[0].lon);

            // Calculer la distance
            const distance = calculateDistance(restaurantLat, restaurantLng, clientLat, clientLng);
            const roundedDistance = Math.round(distance * 10) / 10;

            if (roundedDistance > 20) {
              commandesProblemes.push({
                commandeId: commande.id,
                createdAt: commande.created_at,
                restaurant: restaurant.nom,
                restaurantCoords: { lat: restaurantLat, lng: restaurantLng },
                adresseLivraison: adresseLivraison,
                clientCoords: { lat: clientLat, lng: clientLng },
                distance: roundedDistance,
                fraisLivraison: commande.frais_livraison
              });
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ Erreur géocodage pour commande ${commande.id.slice(0, 8)}:`, error.message);
      }
    }

    // Afficher les résultats
    console.log('\n' + '='.repeat(80));
    console.log(`🚨 ${commandesProblemes.length} COMMANDE(S) AVEC DISTANCE > 20KM`);
    console.log('='.repeat(80) + '\n');

    if (commandesProblemes.length > 0) {
      for (const cmd of commandesProblemes) {
        console.log(`📦 Commande #${cmd.commandeId.slice(0, 8)}`);
        console.log(`   Date: ${new Date(cmd.createdAt).toLocaleString('fr-FR')}`);
        console.log(`   Restaurant: ${cmd.restaurant}`);
        console.log(`   Coordonnées restaurant: ${cmd.restaurantCoords.lat.toFixed(6)}, ${cmd.restaurantCoords.lng.toFixed(6)}`);
        console.log(`   Adresse livraison: ${cmd.adresseLivraison}`);
        console.log(`   Coordonnées client: ${cmd.clientCoords.lat.toFixed(6)}, ${cmd.clientCoords.lng.toFixed(6)}`);
        console.log(`   ⚠️ DISTANCE: ${cmd.distance.toFixed(1)}km (> 20km)`);
        console.log(`   Frais livraison appliqués: ${cmd.fraisLivraison}€`);
        console.log('');
      }
    } else {
      console.log('✅ Aucune commande à plus de 20km trouvée aujourd\'hui.');
    }

    // Vérifier aussi les commandes avec frais de livraison élevés (> 10€)
    console.log('\n' + '='.repeat(80));
    console.log('💰 COMMANDES AVEC FRAIS DE LIVRAISON ÉLEVÉS (> 10€)');
    console.log('='.repeat(80) + '\n');

    const commandesFraisEleves = commandes.filter(cmd => 
      cmd.frais_livraison && parseFloat(cmd.frais_livraison) > 10
    );

    if (commandesFraisEleves.length > 0) {
      for (const cmd of commandesFraisEleves) {
        console.log(`📦 Commande #${cmd.id.slice(0, 8)}`);
        console.log(`   Date: ${new Date(cmd.created_at).toLocaleString('fr-FR')}`);
        console.log(`   Restaurant: ${cmd.restaurants?.nom || 'N/A'}`);
        console.log(`   Adresse: ${cmd.adresse_livraison || 'N/A'}`);
        console.log(`   Frais livraison: ${cmd.frais_livraison}€`);
        console.log('');
      }
    } else {
      console.log('✅ Aucune commande avec frais de livraison > 10€ trouvée.');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

verifierCommandesDistance();


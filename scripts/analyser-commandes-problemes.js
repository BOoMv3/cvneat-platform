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

async function analyserCommandesProblemes() {
  console.log('🔍 Analyse des commandes problématiques...\n');

  const commandeIds = ['b133dfd3', '1813a2f9'];
  
  // Coordonnées par défaut de Ganges
  const DEFAULT_RESTAURANT = {
    lat: 43.9342,
    lng: 3.7098
  };

  for (const commandeIdShort of commandeIds) {
    console.log('='.repeat(80));
    console.log(`📦 Analyse commande #${commandeIdShort}`);
    console.log('='.repeat(80) + '\n');

    try {
      // Rechercher la commande par ID complet ou partiel
      // Essayer d'abord avec l'ID complet (si c'est un UUID complet)
      let commandes = null;
      let searchError = null;
      
      // Si l'ID fait 36 caractères (UUID complet)
      if (commandeIdShort.length === 36) {
        const { data, error } = await supabaseAdmin
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
            user_id,
            restaurants (
              id,
              nom,
              adresse,
              code_postal,
              ville
            ),
            users (
              id,
              email,
              role
            )
          `)
          .eq('id', commandeIdShort);
        commandes = data;
        searchError = error;
      } else {
        // Sinon, chercher avec LIKE (commence par)
        const fullId = commandeIdShort.padEnd(36, '-').slice(0, 36);
        const { data, error } = await supabaseAdmin
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
            user_id,
            restaurants (
              id,
              nom,
              adresse,
              code_postal,
              ville
            ),
            users (
              id,
              email,
              role
            )
          `)
          .ilike('id', `${commandeIdShort}%`);
        commandes = data;
        searchError = error;
      }

      if (searchError || !commandes || commandes.length === 0) {
        console.log(`❌ Commande #${commandeIdShort} non trouvée\n`);
        continue;
      }

      const commande = commandes[0];
      const restaurant = commande.restaurants;
      const user = commande.users;

      console.log(`✅ Commande trouvée: ${commande.id}`);
      console.log(`   Date: ${new Date(commande.created_at).toLocaleString('fr-FR')}`);
      console.log(`   Restaurant: ${restaurant?.nom || 'N/A'}`);
      console.log(`   Restaurant ville: ${restaurant?.ville || 'N/A'}`);
      console.log(`   Restaurant code postal: ${restaurant?.code_postal || 'N/A'}`);
      console.log(`   Restaurant adresse: ${restaurant?.adresse || 'N/A'}`);
      console.log(`   Adresse livraison: ${commande.adresse_livraison}`);
      console.log(`   Ville livraison: ${commande.ville_livraison || 'N/A'}`);
      console.log(`   Frais livraison: ${commande.frais_livraison}€`);
      console.log(`   Statut: ${commande.statut}`);
      console.log(`   Payment status: ${commande.payment_status}`);
      console.log(`   Créée par: ${user?.email || 'N/A'} (role: ${user?.role || 'N/A'})`);
      console.log('');

      // Déterminer les coordonnées du restaurant
      let restaurantLat = DEFAULT_RESTAURANT.lat;
      let restaurantLng = DEFAULT_RESTAURANT.lng;
      let restaurantCoordsSource = 'Défaut Ganges';

      if (restaurant) {
        if (restaurant.ville?.toLowerCase().includes('ganges') || restaurant.code_postal === '34190') {
          restaurantLat = DEFAULT_RESTAURANT.lat;
          restaurantLng = DEFAULT_RESTAURANT.lng;
          restaurantCoordsSource = 'Défaut Ganges';
        } else {
          // Géocoder l'adresse du restaurant si pas à Ganges
          try {
            const restaurantAddress = `${restaurant.adresse || ''}, ${restaurant.code_postal || ''} ${restaurant.ville || ''}, France`.trim();
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
                restaurantCoordsSource = 'Géocodage Nominatim';
              }
            }
          } catch (error) {
            console.log(`   ⚠️ Erreur géocodage restaurant: ${error.message}`);
          }
        }
      }

      console.log(`📍 Coordonnées restaurant: ${restaurantLat.toFixed(6)}, ${restaurantLng.toFixed(6)} (${restaurantCoordsSource})`);

      // Géocoder l'adresse de livraison
      const adresseLivraison = commande.adresse_livraison || '';
      let clientLat = null;
      let clientLng = null;
      let distance = null;

      if (adresseLivraison) {
        try {
          const encodedAddress = encodeURIComponent(`${adresseLivraison}, France`);
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=fr`;
          
          const response = await fetch(url, {
            headers: { 'User-Agent': 'CVNeat-Delivery/1.0' }
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
              clientLat = parseFloat(data[0].lat);
              clientLng = parseFloat(data[0].lon);

              // Calculer la distance
              distance = calculateDistance(restaurantLat, restaurantLng, clientLat, clientLng);
              const roundedDistance = Math.round(distance * 10) / 10;

              console.log(`📍 Coordonnées client: ${clientLat.toFixed(6)}, ${clientLng.toFixed(6)}`);
              console.log(`📏 DISTANCE CALCULÉE: ${roundedDistance.toFixed(1)}km`);
              console.log(`   ⚠️ ${roundedDistance > 10 ? 'DÉPASSE LA LIMITE DE 10KM !' : 'Dans les limites (< 10km)'}`);
              
              if (roundedDistance > 10) {
                console.log(`   🚨 PROBLÈME: Cette commande devrait avoir été refusée !`);
              }
            } else {
              console.log(`   ⚠️ Impossible de géocoder l'adresse de livraison`);
            }
          }
        } catch (error) {
          console.log(`   ⚠️ Erreur géocodage adresse: ${error.message}`);
        }
      }

      console.log('');

    } catch (error) {
      console.error(`❌ Erreur lors de l'analyse de la commande #${commandeIdShort}:`, error.message);
      console.log('');
    }
  }
}

analyserCommandesProblemes();


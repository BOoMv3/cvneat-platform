/**
 * Calcul des gains du livreur basé sur la distance
 * Formule : 2,50€ + 0,80€ par km
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CONFIGURATION
const TARIF_BASE = 2.50;        // 2,50€ de base
const TARIF_PAR_KM = 0.80;      // 0,80€ par km
const TAUX_LIVREUR = 0.80;      // 80% pour le livreur (ou 1.00 pour 100%)
const BONUS_NUIT = 0.00;        // PAS de bonus de nuit

// Fonction pour calculer la distance entre deux points (formule de Haversine)
function calculerDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// Distances approximatives si GPS non disponible (basé sur la connaissance locale)
const DISTANCES_APPROX = {
  'Ganges': 2,
  'Laroque': 6,
  'Cazilhac': 4,
  'Saint-Bauzille-de-Putois': 8,
  'Saint Bauzille de Putois': 8,
  'default': 5
};

function getDistanceApprox(ville) {
  for (const [key, distance] of Object.entries(DISTANCES_APPROX)) {
    if (ville.toLowerCase().includes(key.toLowerCase())) {
      return distance;
    }
  }
  return DISTANCES_APPROX.default;
}

async function calculerGainsAvecDistance() {
  console.log('💰 === CALCUL DES GAINS AVEC DISTANCE ===');
  console.log('📏 Formule: 2,50€ + 0,80€/km\n');

  const aujourd_hui = new Date().toISOString().split('T')[0];
  console.log(`📅 Date: ${aujourd_hui}\n`);

  // Récupérer les commandes
  const { data: commandes, error } = await supabase
    .from('commandes')
    .select(`
      id,
      created_at,
      updated_at,
      statut,
      total,
      adresse_livraison,
      livreur_id,
      restaurant_id,
      restaurants (
        nom,
        adresse
      )
    `)
    .gte('created_at', `${aujourd_hui}T00:00:00`)
    .lte('created_at', `${aujourd_hui}T23:59:59`)
    .eq('statut', 'livree')
    .not('livreur_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  if (!commandes || commandes.length === 0) {
    console.log('ℹ️ Aucune commande livrée trouvée');
    return;
  }

  console.log(`📦 ${commandes.length} livraisons effectuées\n`);
  console.log('🎁 Livraisons GRATUITES ce soir pour les clients\n');
  console.log('═'.repeat(100));

  // Récupérer infos livreur
  const livreurIds = [...new Set(commandes.map(c => c.livreur_id))];
  const { data: livreurs } = await supabase
    .from('users')
    .select('id, prenom, nom, telephone')
    .in('id', livreurIds);

  const livreursMap = {};
  if (livreurs) {
    livreurs.forEach(l => {
      livreursMap[l.id] = l;
    });
  }

  let totalFraisPotentiels = 0;
  let totalGainsLivreur = 0;
  let totalBonus = 0;
  let totalKm = 0;

  console.log('\n💵 CALCUL PAR LIVRAISON:\n');

  commandes.forEach((cmd, index) => {
    const heure = new Date(cmd.created_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const heureNum = new Date(cmd.created_at).getHours();
    const estNuit = heureNum >= 20 || heureNum < 6;

    // Extraire la ville
    const adresse = cmd.adresse_livraison || '';
    const parties = adresse.split(',');
    const ville = parties.length > 1 ? parties[1].trim() : adresse;

    // Calculer la distance (approximative basée sur la ville)
    const distance = getDistanceApprox(ville);
    const methodeCalcul = 'Approx';

    // Calcul des frais : 2,50€ + 0,80€/km
    const fraisLivraison = TARIF_BASE + (distance * TARIF_PAR_KM);
    const bonus = estNuit ? BONUS_NUIT : 0;
    const gainsBase = fraisLivraison * TAUX_LIVREUR;
    const gainsTotal = gainsBase + bonus;

    totalFraisPotentiels += fraisLivraison;
    totalGainsLivreur += gainsBase;
    totalBonus += bonus;
    totalKm += distance;

    console.log(`${index + 1}. ${heure} - ${cmd.restaurants?.nom || 'Restaurant'}`);
    console.log(`   📍 Destination: ${ville}`);
    console.log(`   📏 Distance: ${distance.toFixed(2)} km (${methodeCalcul})`);
    console.log(`   💰 Montant commande: ${parseFloat(cmd.total || 0).toFixed(2)}€`);
    console.log(`   🚚 Frais livraison: 2,50€ + (${distance.toFixed(2)}km × 0,80€) = ${fraisLivraison.toFixed(2)}€`);
    console.log(`   💵 Gains livreur (${(TAUX_LIVREUR * 100)}%): ${gainsBase.toFixed(2)}€${bonus > 0 ? ` + ${bonus.toFixed(2)}€ (bonus nuit)` : ''}`);
    console.log(`   ✨ TOTAL: ${gainsTotal.toFixed(2)}€\n`);
  });

  console.log('═'.repeat(100));

  // Résumé par livreur
  console.log('\n👤 RÉSUMÉ PAR LIVREUR:\n');

  livreurIds.forEach(livreurId => {
    const livreur = livreursMap[livreurId];
    const commandesLivreur = commandes.filter(c => c.livreur_id === livreurId);
    
    let fraisLivreur = 0;
    let gainsLivreur = 0;
    let bonusLivreur = 0;
    let kmLivreur = 0;

    commandesLivreur.forEach(cmd => {
      const heureNum = new Date(cmd.created_at).getHours();
      const estNuit = heureNum >= 20 || heureNum < 6;
      
      // Calculer distance (approximative)
      const adresse = cmd.adresse_livraison || '';
      const parties = adresse.split(',');
      const ville = parties.length > 1 ? parties[1].trim() : adresse;
      const distance = getDistanceApprox(ville);

      const frais = TARIF_BASE + (distance * TARIF_PAR_KM);
      const bonus = estNuit ? BONUS_NUIT : 0;
      
      fraisLivreur += frais;
      gainsLivreur += frais * TAUX_LIVREUR;
      bonusLivreur += bonus;
      kmLivreur += distance;
    });

    const nom = livreur ? `${livreur.prenom || ''} ${livreur.nom || ''}`.trim() : 'Livreur';
    const tel = livreur?.telephone || 'N/A';

    console.log(`   Nom: ${nom}`);
    console.log(`   Téléphone: ${tel}`);
    console.log(`   Livraisons: ${commandesLivreur.length}`);
    console.log(`   Distance totale: ${kmLivreur.toFixed(2)} km`);
    console.log(`   Frais totaux: ${fraisLivreur.toFixed(2)}€`);
    console.log(`   Gains base: ${gainsLivreur.toFixed(2)}€`);
    if (bonusLivreur > 0) {
      console.log(`   Bonus nuit: +${bonusLivreur.toFixed(2)}€`);
    }
    console.log(`   💰 GAINS NET: ${(gainsLivreur + bonusLivreur).toFixed(2)}€`);
    console.log(`   📊 Moyenne par livraison: ${((gainsLivreur + bonusLivreur) / commandesLivreur.length).toFixed(2)}€`);
    console.log(`   📊 Moyenne par km: ${((gainsLivreur + bonusLivreur) / kmLivreur).toFixed(2)}€/km\n`);
  });

  console.log('═'.repeat(100));

  // Résumé global
  const gainsNetTotal = totalGainsLivreur + totalBonus;
  console.log('\n📊 RÉSUMÉ GLOBAL:\n');
  console.log(`   📦 Nombre de livraisons: ${commandes.length}`);
  console.log(`   📏 Distance totale parcourue: ${totalKm.toFixed(2)} km`);
  console.log(`   📏 Distance moyenne par livraison: ${(totalKm / commandes.length).toFixed(2)} km`);
  console.log(`   💵 Frais de livraison totaux: ${totalFraisPotentiels.toFixed(2)}€`);
  console.log(`   💰 Gains livreur base (${(TAUX_LIVREUR * 100)}%): ${totalGainsLivreur.toFixed(2)}€`);
  if (totalBonus > 0) {
    console.log(`   🎁 Bonus nuit: +${totalBonus.toFixed(2)}€`);
  }
  console.log(`   ✨ GAINS NET DU LIVREUR: ${gainsNetTotal.toFixed(2)}€`);
  console.log(`   📊 Moyenne par livraison: ${(gainsNetTotal / commandes.length).toFixed(2)}€`);
  console.log(`   📊 Prix par km: ${(gainsNetTotal / totalKm).toFixed(2)}€/km`);

  console.log('\n═'.repeat(100));

  console.log('\n💡 NOTES:');
  console.log(`   • Formule: 2,50€ base + 0,80€ par kilomètre`);
  console.log(`   • Le livreur reçoit ${(TAUX_LIVREUR * 100)}% des frais de livraison`);
  console.log(`   • Bonus de +${BONUS_NUIT.toFixed(2)}€ pour les livraisons de nuit (après 20h)`);
  console.log(`   • Ce soir les livraisons étaient GRATUITES pour les clients`);
  console.log(`   • Le livreur aurait gagné ${gainsNetTotal.toFixed(2)}€ si les frais étaient facturés`);
  
  // Note sur le calcul des distances
  console.log(`   ⚠️  Toutes les distances sont calculées de façon approximative`);
  console.log(`   💡 Distances utilisées: Ganges 2km, Laroque 6km, Cazilhac 4km, St-Bauzille 8km`);

  console.log('\n✅ Calcul terminé !\n');
}

calculerGainsAvecDistance()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });


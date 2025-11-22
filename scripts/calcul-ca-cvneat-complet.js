/**
 * Calcul du CA complet de CVN'EAT
 * Inclut : frais de plateforme sur commandes + frais de livraison
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CONFIGURATION
const TARIF_BASE = 2.50;        // 2,50€ de base pour livraison
const TARIF_PAR_KM = 0.80;      // 0,80€ par km
const TAUX_LIVREUR = 0.80;      // 80% pour le livreur
const TAUX_CVNEAT_LIVRAISON = 0.20; // 20% pour CVN'EAT sur livraison

// Commission CVN'EAT sur les commandes (à ajuster selon votre politique)
const COMMISSION_CVNEAT = 0.15;  // 15% de commission sur le montant des commandes
const FRAIS_PLATEFORME = 0.49;   // 0,49€ de frais de plateforme par commande

// Distances approximatives
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

async function calculerCAComplet() {
  console.log('💰 === CALCUL DU CA COMPLET DE CVN\'EAT ===\n');

  // Utiliser la date d'hier (21 novembre) pour les commandes de ce soir
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);
  const dateRecherche = hier.toISOString().split('T')[0];
  console.log(`📅 Date: ${dateRecherche} (hier soir)\n`);

  // Récupérer toutes les commandes du jour
  const { data: commandes, error } = await supabase
    .from('commandes')
    .select(`
      id,
      created_at,
      statut,
      total,
      frais_livraison,
      adresse_livraison,
      livreur_id,
      restaurant_id,
      restaurants (nom)
    `)
    .gte('created_at', `${dateRecherche}T00:00:00`)
    .lte('created_at', `${dateRecherche}T23:59:59`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  if (!commandes || commandes.length === 0) {
    console.log('ℹ️ Aucune commande trouvée');
    return;
  }

  console.log(`📦 ${commandes.length} commandes trouvées\n`);
  console.log('═'.repeat(100));

  // Calculer les revenus
  let caTotal = 0;
  let caLivraison = 0;
  let caCommission = 0;
  let caFraisPlateforme = 0;
  let totalCommandes = 0;
  let totalLivraisons = 0;

  console.log('\n💵 DÉTAIL DES REVENUS PAR COMMANDE:\n');

  commandes.forEach((cmd, index) => {
    const heure = new Date(cmd.created_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const montantCommande = parseFloat(cmd.total || 0);
    totalCommandes += montantCommande;

    // 1. Commission sur la commande (si applicable)
    const commission = montantCommande * COMMISSION_CVNEAT;
    
    // 2. Frais de plateforme (0,49€ par commande)
    const fraisPlateforme = FRAIS_PLATEFORME;
    
    // 3. Frais de livraison (calculés si non enregistrés)
    let fraisLivraison = parseFloat(cmd.frais_livraison || 0);
    let partCVNEATLivraison = 0;
    
    if (cmd.statut === 'livree' && cmd.livreur_id) {
      // Si pas de frais enregistrés, calculer avec la formule
      if (fraisLivraison === 0) {
        const adresse = cmd.adresse_livraison || '';
        const parties = adresse.split(',');
        const ville = parties.length > 1 ? parties[1].trim() : adresse;
        const distance = getDistanceApprox(ville);
        fraisLivraison = TARIF_BASE + (distance * TARIF_PAR_KM);
      }
      // Part de CVN'EAT sur la livraison (20%)
      partCVNEATLivraison = fraisLivraison * TAUX_CVNEAT_LIVRAISON;
      totalLivraisons += fraisLivraison;
    }

    // Total revenus pour cette commande
    const revenusCommande = commission + fraisPlateforme + partCVNEATLivraison;
    caTotal += revenusCommande;
    caCommission += commission;
    caFraisPlateforme += fraisPlateforme;
    caLivraison += partCVNEATLivraison;

    console.log(`${index + 1}. ${heure} - ${cmd.restaurants?.nom || 'Restaurant'}`);
    console.log(`   💰 Montant commande: ${montantCommande.toFixed(2)}€`);
    console.log(`   📊 Commission (${(COMMISSION_CVNEAT * 100)}%): ${commission.toFixed(2)}€`);
    console.log(`   💼 Frais plateforme: ${fraisPlateforme.toFixed(2)}€`);
    if (partCVNEATLivraison > 0) {
      console.log(`   🚚 Part livraison (${(TAUX_CVNEAT_LIVRAISON * 100)}%): ${partCVNEATLivraison.toFixed(2)}€`);
    }
    console.log(`   ✨ Total revenus: ${revenusCommande.toFixed(2)}€`);
    console.log(`   📍 Statut: ${cmd.statut}\n`);
  });

  console.log('═'.repeat(100));

  // Résumé global
  console.log('\n📊 RÉSUMÉ DU CA DE CVN\'EAT:\n');
  console.log(`   💰 Chiffre d'affaires total des commandes: ${totalCommandes.toFixed(2)}€`);
  console.log(`   📦 Nombre de commandes: ${commandes.length}`);
  console.log(`   🚚 Nombre de livraisons: ${commandes.filter(c => c.statut === 'livree' && c.livreur_id).length}\n`);

  console.log('   💼 REVENUS DE CVN\'EAT (CA BRUT):\n');
  console.log(`   📊 Commission sur commandes (${(COMMISSION_CVNEAT * 100)}%): ${caCommission.toFixed(2)}€`);
  console.log(`   💼 Frais de plateforme (${FRAIS_PLATEFORME.toFixed(2)}€/commande): ${caFraisPlateforme.toFixed(2)}€`);
  console.log(`   🚚 Part sur livraisons (${(TAUX_CVNEAT_LIVRAISON * 100)}%): ${caLivraison.toFixed(2)}€`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   ✨ CA BRUT TOTAL CVN'EAT: ${caTotal.toFixed(2)}€\n`);

  // Détail par source
  console.log('═'.repeat(100));
  console.log('\n📈 RÉPARTITION DES REVENUS:\n');
  
  if (caTotal > 0) {
    const pourcentageCommission = (caCommission / caTotal * 100).toFixed(1);
    const pourcentageFraisPlateforme = (caFraisPlateforme / caTotal * 100).toFixed(1);
    const pourcentageLivraison = (caLivraison / caTotal * 100).toFixed(1);

    console.log(`   Commission: ${caCommission.toFixed(2)}€ (${pourcentageCommission}%)`);
    console.log(`   Frais plateforme: ${caFraisPlateforme.toFixed(2)}€ (${pourcentageFraisPlateforme}%)`);
    console.log(`   Livraisons: ${caLivraison.toFixed(2)}€ (${pourcentageLivraison}%)\n`);
  } else {
    console.log(`   Aucun revenu enregistré\n`);
  }

  // Comparaison avec les livraisons gratuites
  console.log('═'.repeat(100));
  console.log('\n💡 NOTES:\n');
  console.log(`   • Ce soir les livraisons étaient GRATUITES pour les clients`);
  console.log(`   • Si les frais de livraison avaient été facturés:`);
  console.log(`     → CVN'EAT aurait gagné ${caLivraison.toFixed(2)}€ de plus sur les livraisons`);
  console.log(`   • Commission calculée: ${(COMMISSION_CVNEAT * 100)}% sur le montant des commandes`);
  console.log(`   • Frais de plateforme: ${FRAIS_PLATEFORME.toFixed(2)}€ par commande (inclus dans le CA brut)`);
  console.log(`   • Pourcentage livraison: ${(TAUX_CVNEAT_LIVRAISON * 100)}% pour CVN'EAT, ${(TAUX_LIVREUR * 100)}% pour le livreur`);
  console.log(`   • CA BRUT réel ce soir: ${caTotal.toFixed(2)}€`);
  console.log(`   • CA BRUT potentiel (si livraisons facturées): ${(caTotal + caLivraison).toFixed(2)}€\n`);

  console.log('✅ Calcul terminé !\n');
}

calculerCAComplet()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });


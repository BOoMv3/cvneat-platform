/**
 * Calcul du CA complet de CVN'EAT
 * Aligné sur les règles réelles de l'app: commission par restaurant (0% / 15% / 20%),
 * 10% sur livraison si > 2,50€, montant articles après réduction, frais plateforme 0,49€.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Aligné avec app/api/orders/route.js et lib/commission.js
const FRAIS_PLATEFORME = 0.49;
const DELIVERY_COMMISSION_RATE = 0.10; // 10% sur frais livraison si > 2,50€
const DELIVERY_BASE_FEE = 2.50;

// Fallback si pas de frais enregistrés (approximatif)
const TARIF_BASE = 2.50;
const TARIF_PAR_KM = 0.80;

// Taux commission par restaurant (aligné lib/commission.js)
function getCommissionRatePercent(restaurantName, restaurantRatePercent) {
  const n = (restaurantName || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (n.includes('bonne pate')) return 0;
  if (n.includes("all'ovale") || n.includes('allovale') || n.includes('all ovale')) return 15;
  const r = parseFloat(restaurantRatePercent);
  return Number.isFinite(r) ? r : 20;
}

const DISTANCES_APPROX = {
  'Ganges': 2, 'Laroque': 6, 'Cazilhac': 4,
  'Saint-Bauzille-de-Putois': 8, 'Saint Bauzille de Putois': 8,
  'default': 5
};

function getDistanceApprox(ville) {
  for (const [key, distance] of Object.entries(DISTANCES_APPROX)) {
    if (ville.toLowerCase().includes(key.toLowerCase())) return distance;
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

  // Récupérer toutes les commandes du jour (champs financiers pour alignement avec l'app)
  const { data: commandes, error } = await supabase
    .from('commandes')
    .select(`
      id,
      created_at,
      statut,
      total,
      discount_amount,
      frais_livraison,
      adresse_livraison,
      livreur_id,
      restaurant_id,
      commission_rate,
      commission_amount,
      restaurant_payout,
      delivery_commission_cvneat,
      restaurants (nom, commission_rate)
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

    const totalArticles = parseFloat(cmd.total || 0);
    const discount = parseFloat(cmd.discount_amount || 0) || 0;
    const montantCommande = Math.max(0, totalArticles - discount); // Montant réellement payé pour les articles
    totalCommandes += montantCommande;

    const restau = cmd.restaurants || {};
    const ratePercent = getCommissionRatePercent(restau.nom, restau.commission_rate);

    // 1. Commission articles: préférer la valeur stockée (cohérente avec les virements)
    let commission = cmd.commission_amount != null ? parseFloat(cmd.commission_amount) : null;
    if (commission == null) commission = Math.round(montantCommande * (ratePercent / 100) * 100) / 100;

    const fraisPlateforme = FRAIS_PLATEFORME;

    let fraisLivraison = parseFloat(cmd.frais_livraison || 0);
    let partCVNEATLivraison = 0;
    if (cmd.statut === 'livree' && cmd.livreur_id) {
      if (fraisLivraison === 0) {
        const adresse = cmd.adresse_livraison || '';
        const ville = adresse.split(',').length > 1 ? adresse.split(',')[1].trim() : adresse;
        fraisLivraison = TARIF_BASE + (getDistanceApprox(ville) * TARIF_PAR_KM);
      }
      totalLivraisons += fraisLivraison;
      partCVNEATLivraison = cmd.delivery_commission_cvneat != null
        ? parseFloat(cmd.delivery_commission_cvneat)
        : (fraisLivraison > DELIVERY_BASE_FEE ? Math.round(fraisLivraison * DELIVERY_COMMISSION_RATE * 100) / 100 : 0);
    }

    const revenusCommande = commission + fraisPlateforme + partCVNEATLivraison;
    caTotal += revenusCommande;
    caCommission += commission;
    caFraisPlateforme += fraisPlateforme;
    caLivraison += partCVNEATLivraison;

    console.log(`${index + 1}. ${heure} - ${restau.nom || 'Restaurant'}`);
    console.log(`   💰 Montant articles (après réduction): ${montantCommande.toFixed(2)}€`);
    if (discount > 0) console.log(`   🏷️ Réduction appliquée: -${discount.toFixed(2)}€`);
    console.log(`   📊 Commission (${ratePercent}%): ${commission.toFixed(2)}€`);
    console.log(`   💼 Frais plateforme: ${fraisPlateforme.toFixed(2)}€`);
    if (partCVNEATLivraison > 0) {
      console.log(`   🚚 Part livraison (10% si > 2,50€): ${partCVNEATLivraison.toFixed(2)}€`);
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
  console.log(`   📊 Commission sur commandes (0% / 15% / 20% selon restaurant): ${caCommission.toFixed(2)}€`);
  console.log(`   💼 Frais de plateforme (${FRAIS_PLATEFORME.toFixed(2)}€/commande): ${caFraisPlateforme.toFixed(2)}€`);
  console.log(`   🚚 Part sur livraisons (10% si > 2,50€): ${caLivraison.toFixed(2)}€`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   ✨ CA BRUT TOTAL CVN'EAT: ${caTotal.toFixed(2)}€\n`);

  console.log('═'.repeat(100));
  console.log('\n📈 RÉPARTITION DES REVENUS:\n');
  if (caTotal > 0) {
    const pctCommission = (caCommission / caTotal * 100).toFixed(1);
    const pctPlateforme = (caFraisPlateforme / caTotal * 100).toFixed(1);
    const pctLivraison = (caLivraison / caTotal * 100).toFixed(1);
    console.log(`   Commission: ${caCommission.toFixed(2)}€ (${pctCommission}%)`);
    console.log(`   Frais plateforme: ${caFraisPlateforme.toFixed(2)}€ (${pctPlateforme}%)`);
    console.log(`   Livraisons: ${caLivraison.toFixed(2)}€ (${pctLivraison}%)\n`);
  } else {
    console.log(`   Aucun revenu enregistré\n`);
  }

  console.log('═'.repeat(100));
  console.log('\n💡 RÈGLES APPLIQUÉES (alignées avec l\'app):\n');
  console.log(`   • Commission articles: La Bonne Pâte 0%, All'ovale 15%, autres 20% (ou commission_rate)`);
  console.log(`   • Montant pris en compte: sous-total articles APRÈS réduction (code promo)`);
  console.log(`   • Livraison: 10% pour CVN'EAT si frais > 2,50€; sinon 0€`);
  console.log(`   • Frais plateforme: ${FRAIS_PLATEFORME.toFixed(2)}€ par commande`);
  console.log(`   • CA BRUT total: ${caTotal.toFixed(2)}€\n`);

  console.log('✅ Calcul terminé !\n');
}

calculerCAComplet()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });


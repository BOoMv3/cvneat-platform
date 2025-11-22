/**
 * Script pour calculer les gains potentiels du livreur
 * si les livraisons n'étaient pas gratuites
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CONFIGURATION DES TARIFS
// Ajustez ces valeurs selon votre politique de prix
const TARIFS = {
  // Tarifs par zone/ville
  zones: {
    'Ganges': 3.50,
    'Laroque': 4.00,
    'Cazilhac': 3.50,
    'Saint-Bauzille-de-Putois': 4.50,
    'Saint Bauzille de Putois': 4.50,
    'default': 3.50 // Tarif par défaut
  },
  // OU tarif fixe unique pour toutes les livraisons
  tarifFixe: 3.50,
  // OU tarifs par tranches de montant
  parMontant: {
    moins_de_20: 3.00,
    de_20_a_40: 3.50,
    plus_de_40: 4.00
  }
};

// Pourcentage que garde le livreur
const TAUX_LIVREUR = 0.80; // 80%

// Bonus
const BONUS_NUIT = 1.00; // +1€ après 20h

function calculerFraisLivraison(commande, methode = 'zone') {
  switch (methode) {
    case 'zone':
      // Extraire la ville de l'adresse
      const adresse = commande.adresse_livraison || '';
      const parties = adresse.split(',');
      const ville = parties.length > 1 ? parties[1].trim() : '';
      
      // Chercher le tarif pour cette ville
      let tarif = TARIFS.zones.default;
      for (const [zone, prix] of Object.entries(TARIFS.zones)) {
        if (ville.toLowerCase().includes(zone.toLowerCase())) {
          tarif = prix;
          break;
        }
      }
      return tarif;

    case 'fixe':
      return TARIFS.tarifFixe;

    case 'montant':
      const total = parseFloat(commande.total) || 0;
      if (total < 20) return TARIFS.parMontant.moins_de_20;
      if (total <= 40) return TARIFS.parMontant.de_20_a_40;
      return TARIFS.parMontant.plus_de_40;

    default:
      return TARIFS.tarifFixe;
  }
}

async function calculerGainsPotentiels() {
  console.log('💰 === CALCUL DES GAINS POTENTIELS (sans gratuite) ===\n');

  const aujourd_hui = new Date().toISOString().split('T')[0];
  console.log(`📅 Date: ${aujourd_hui}\n`);

  // Récupérer les commandes livrées
  const { data: commandes, error } = await supabase
    .from('commandes')
    .select(`
      id,
      created_at,
      updated_at,
      statut,
      total,
      frais_livraison,
      adresse_livraison,
      livreur_id,
      restaurant_id,
      restaurants (nom)
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

  // Calculer les frais pour chaque commande
  let totalFraisPotentiels = 0;
  let totalGainsLivreur = 0;
  let totalBonus = 0;

  console.log('\n💵 CALCUL DES FRAIS POTENTIELS PAR LIVRAISON:\n');

  commandes.forEach((cmd, index) => {
    const heure = new Date(cmd.created_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const heureNum = new Date(cmd.created_at).getHours();
    const estNuit = heureNum >= 20 || heureNum < 6;

    // Calculer les frais normaux (MÉTHODE : zone)
    const fraisNormaux = calculerFraisLivraison(cmd, 'zone');
    const bonus = estNuit ? BONUS_NUIT : 0;
    const gainsBase = fraisNormaux * TAUX_LIVREUR;
    const gainsTotal = gainsBase + bonus;

    totalFraisPotentiels += fraisNormaux;
    totalGainsLivreur += gainsBase;
    totalBonus += bonus;

    // Extraire la ville
    const adresse = cmd.adresse_livraison || '';
    const parties = adresse.split(',');
    const ville = parties.length > 1 ? parties[1].trim() : adresse;

    console.log(`${index + 1}. ${heure} - ${cmd.restaurants?.nom || 'Restaurant'}`);
    console.log(`   📍 Destination: ${ville}`);
    console.log(`   💰 Montant commande: ${parseFloat(cmd.total || 0).toFixed(2)}€`);
    console.log(`   🚚 Frais livraison normaux: ${fraisNormaux.toFixed(2)}€`);
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

    commandesLivreur.forEach(cmd => {
      const heureNum = new Date(cmd.created_at).getHours();
      const estNuit = heureNum >= 20 || heureNum < 6;
      const frais = calculerFraisLivraison(cmd, 'zone');
      const bonus = estNuit ? BONUS_NUIT : 0;
      
      fraisLivreur += frais;
      gainsLivreur += frais * TAUX_LIVREUR;
      bonusLivreur += bonus;
    });

    const nom = livreur ? `${livreur.prenom || ''} ${livreur.nom || ''}`.trim() : 'Livreur';
    const tel = livreur?.telephone || 'N/A';

    console.log(`   Nom: ${nom}`);
    console.log(`   Téléphone: ${tel}`);
    console.log(`   Livraisons: ${commandesLivreur.length}`);
    console.log(`   Frais totaux: ${fraisLivreur.toFixed(2)}€`);
    console.log(`   Gains base: ${gainsLivreur.toFixed(2)}€`);
    if (bonusLivreur > 0) {
      console.log(`   Bonus nuit: +${bonusLivreur.toFixed(2)}€`);
    }
    console.log(`   💰 GAINS NET: ${(gainsLivreur + bonusLivreur).toFixed(2)}€`);
    console.log(`   📊 Moyenne par livraison: ${((gainsLivreur + bonusLivreur) / commandesLivreur.length).toFixed(2)}€\n`);
  });

  console.log('═'.repeat(100));

  // Résumé global
  const gainsNetTotal = totalGainsLivreur + totalBonus;
  console.log('\n📊 RÉSUMÉ GLOBAL:\n');
  console.log(`   📦 Nombre de livraisons: ${commandes.length}`);
  console.log(`   💵 Frais de livraison totaux (non perçus): ${totalFraisPotentiels.toFixed(2)}€`);
  console.log(`   💰 Gains livreur base (${(TAUX_LIVREUR * 100)}%): ${totalGainsLivreur.toFixed(2)}€`);
  if (totalBonus > 0) {
    console.log(`   🎁 Bonus nuit: +${totalBonus.toFixed(2)}€`);
  }
  console.log(`   ✨ GAINS NET DU LIVREUR: ${gainsNetTotal.toFixed(2)}€`);
  console.log(`   📊 Moyenne par livraison: ${(gainsNetTotal / commandes.length).toFixed(2)}€`);

  // Comparaison avec différentes méthodes
  console.log('\n📊 COMPARAISON AVEC D\'AUTRES MÉTHODES:\n');

  // Méthode fixe
  const fraisFixeTotal = commandes.length * TARIFS.tarifFixe;
  const gainsFixe = fraisFixeTotal * TAUX_LIVREUR + totalBonus;
  console.log(`   Tarif fixe ${TARIFS.tarifFixe}€/livraison:`);
  console.log(`   → Frais totaux: ${fraisFixeTotal.toFixed(2)}€`);
  console.log(`   → Gains livreur: ${gainsFixe.toFixed(2)}€\n`);

  // Méthode par montant
  let fraisMontantTotal = 0;
  commandes.forEach(cmd => {
    fraisMontantTotal += calculerFraisLivraison(cmd, 'montant');
  });
  const gainsMontant = fraisMontantTotal * TAUX_LIVREUR + totalBonus;
  console.log(`   Tarif selon montant commande:`);
  console.log(`   → Frais totaux: ${fraisMontantTotal.toFixed(2)}€`);
  console.log(`   → Gains livreur: ${gainsMontant.toFixed(2)}€\n`);

  console.log('═'.repeat(100));

  console.log('\n💡 NOTES:');
  console.log(`   • Ce soir les livraisons étaient GRATUITES pour les clients`);
  console.log(`   • Le livreur aurait gagné ${gainsNetTotal.toFixed(2)}€ si les frais étaient facturés`);
  console.log(`   • Calcul basé sur: ${(TAUX_LIVREUR * 100)}% des frais + bonus nuit`);
  console.log(`   • Tarifs utilisés: par zone géographique`);
  console.log(`   • Pour changer la méthode de calcul, éditez le fichier .js\n`);

  console.log('✅ Calcul terminé !\n');
}

calculerGainsPotentiels()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });


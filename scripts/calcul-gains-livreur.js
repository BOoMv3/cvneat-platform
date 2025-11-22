/**
 * Script pour calculer les gains des livreurs avec les commandes de ce soir
 * 
 * Usage: node scripts/calcul-gains-livreur.js
 */

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Politique de rémunération (à personnaliser)
const TAUX_LIVREUR = 0.80; // 80% des frais de livraison vont au livreur
const BONUS_NUIT = 1.00; // +1€ par livraison de nuit (20h-6h)
const BONUS_DISTANCE = 2.00; // +2€ si > 5km

async function calculerGainsLivreurs() {
  console.log('💰 === CALCUL DES GAINS DES LIVREURS ===\n');

  try {
    // Date du jour
    const aujourd_hui = new Date().toISOString().split('T')[0];
    console.log(`📅 Date: ${aujourd_hui}\n`);

    // 1. Récupérer toutes les commandes du jour
    const { data: commandes, error: commandesError } = await supabase
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
        restaurants (
          nom,
          adresse
        )
      `)
      .gte('created_at', `${aujourd_hui}T00:00:00`)
      .lte('created_at', `${aujourd_hui}T23:59:59`)
      .order('created_at', { ascending: false });

    if (commandesError) {
      console.error('❌ Erreur récupération commandes:', commandesError);
      return;
    }

    if (!commandes || commandes.length === 0) {
      console.log('ℹ️ Aucune commande trouvée pour aujourd\'hui');
      return;
    }

    console.log(`📊 ${commandes.length} commandes trouvées aujourd'hui`);

    // Récupérer les informations des livreurs séparément
    const livreurIds = [...new Set(commandes.filter(c => c.livreur_id).map(c => c.livreur_id))];
    
    let livreursMap = {};
    if (livreurIds.length > 0) {
      console.log(`📦 Récupération des informations de ${livreurIds.length} livreurs...\n`);
      const { data: livreurs, error: livreursError } = await supabase
        .from('users')
        .select('id, prenom, nom, telephone, email')
        .in('id', livreurIds);

      if (!livreursError && livreurs) {
        livreurs.forEach(livreur => {
          livreursMap[livreur.id] = livreur;
        });
      }
    }

    // 2. Statistiques générales
    const stats = {
      total: commandes.length,
      livrees: commandes.filter(c => c.statut === 'livree').length,
      en_livraison: commandes.filter(c => c.statut === 'en_livraison').length,
      en_attente: commandes.filter(c => c.statut === 'pret_a_livrer').length,
      annulees: commandes.filter(c => c.statut === 'annulee').length,
    };

    console.log('📈 STATISTIQUES GÉNÉRALES:');
    console.log(`   ✅ Livrées: ${stats.livrees}`);
    console.log(`   🚚 En cours de livraison: ${stats.en_livraison}`);
    console.log(`   ⏳ En attente: ${stats.en_attente}`);
    console.log(`   ❌ Annulées: ${stats.annulees}\n`);

    // 3. Calculer les gains par livreur
    const commandesLivrees = commandes.filter(c => 
      c.statut === 'livree' && c.livreur_id && c.frais_livraison > 0
    );

    if (commandesLivrees.length === 0) {
      console.log('ℹ️ Aucune commande livrée avec frais de livraison');
      return;
    }

    // Grouper par livreur
    const gainsParLivreur = {};
    
    commandesLivrees.forEach(commande => {
      const livreurId = commande.livreur_id;
      const livreur = livreursMap[livreurId];
      
      if (!livreur) {
        console.warn(`⚠️ Livreur ${livreurId} non trouvé dans la base`);
        return;
      }

      if (!gainsParLivreur[livreurId]) {
        gainsParLivreur[livreurId] = {
          id: livreurId,
          nom: `${livreur.prenom || ''} ${livreur.nom || ''}`.trim() || livreur.email || 'Livreur',
          telephone: livreur.telephone || 'N/A',
          email: livreur.email || 'N/A',
          nombre_livraisons: 0,
          frais_total: 0,
          gains_base: 0,
          bonus_total: 0,
          gains_net: 0,
          commandes: []
        };
      }

      // Calculer les bonus
      const heure = new Date(commande.created_at).getHours();
      const estNuit = heure >= 20 || heure < 6;
      const bonusCommande = estNuit ? BONUS_NUIT : 0;

      const frais = parseFloat(commande.frais_livraison) || 0;
      const gainsBase = frais * TAUX_LIVREUR;
      const gainsTotal = gainsBase + bonusCommande;

      gainsParLivreur[livreurId].nombre_livraisons++;
      gainsParLivreur[livreurId].frais_total += frais;
      gainsParLivreur[livreurId].gains_base += gainsBase;
      gainsParLivreur[livreurId].bonus_total += bonusCommande;
      gainsParLivreur[livreurId].gains_net += gainsTotal;
      gainsParLivreur[livreurId].commandes.push({
        id: commande.id,
        heure: commande.created_at,
        restaurant: commande.restaurants?.nom || 'N/A',
        frais: frais,
        gains: gainsTotal,
        bonus: bonusCommande > 0 ? `+${bonusCommande.toFixed(2)}€ (nuit)` : null
      });
    });

    // 4. Afficher les résultats
    console.log('💰 GAINS PAR LIVREUR:\n');
    console.log('═'.repeat(80));

    const livreurs = Object.values(gainsParLivreur).sort((a, b) => b.gains_net - a.gains_net);
    
    livreurs.forEach((livreur, index) => {
      console.log(`\n${index + 1}. 👤 ${livreur.nom}`);
      console.log(`   📱 ${livreur.telephone || 'N/A'}`);
      console.log(`   📦 Nombre de livraisons: ${livreur.nombre_livraisons}`);
      console.log(`   💵 Frais de livraison total: ${livreur.frais_total.toFixed(2)}€`);
      console.log(`   💰 Gains de base (${(TAUX_LIVREUR * 100).toFixed(0)}%): ${livreur.gains_base.toFixed(2)}€`);
      
      if (livreur.bonus_total > 0) {
        console.log(`   🎁 Bonus: +${livreur.bonus_total.toFixed(2)}€`);
      }
      
      console.log(`   ✨ GAINS NET: ${livreur.gains_net.toFixed(2)}€`);
      console.log(`   📊 Moyenne par livraison: ${(livreur.gains_net / livreur.nombre_livraisons).toFixed(2)}€`);
      
      // Détail des livraisons
      console.log(`\n   📋 Détail des livraisons:`);
      livreur.commandes.forEach((cmd, i) => {
        const bonus = cmd.bonus ? ` ${cmd.bonus}` : '';
        const heure = new Date(cmd.heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        console.log(`      ${i + 1}. ${heure} - ${cmd.restaurant} - ${cmd.gains.toFixed(2)}€${bonus}`);
      });
    });

    // 5. Total global
    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 RÉSUMÉ GLOBAL:\n');
    
    const totalLivreurs = livreurs.length;
    const totalLivraisons = livreurs.reduce((sum, l) => sum + l.nombre_livraisons, 0);
    const totalFrais = livreurs.reduce((sum, l) => sum + l.frais_total, 0);
    const totalGains = livreurs.reduce((sum, l) => sum + l.gains_net, 0);
    const totalBonus = livreurs.reduce((sum, l) => sum + l.bonus_total, 0);

    console.log(`   👥 Nombre de livreurs actifs: ${totalLivreurs}`);
    console.log(`   📦 Total de livraisons: ${totalLivraisons}`);
    console.log(`   💵 Total frais de livraison: ${totalFrais.toFixed(2)}€`);
    console.log(`   💰 Total gains base: ${(totalGains - totalBonus).toFixed(2)}€`);
    
    if (totalBonus > 0) {
      console.log(`   🎁 Total bonus: ${totalBonus.toFixed(2)}€`);
    }
    
    console.log(`   ✨ TOTAL GAINS NET: ${totalGains.toFixed(2)}€`);
    console.log(`   📊 Moyenne par livreur: ${(totalGains / totalLivreurs).toFixed(2)}€`);
    console.log(`   📊 Moyenne par livraison: ${(totalGains / totalLivraisons).toFixed(2)}€`);

    // 6. Répartition par heure
    console.log('\n⏰ RÉPARTITION PAR HEURE:\n');
    
    const parHeure = {};
    commandesLivrees.forEach(commande => {
      const heure = new Date(commande.created_at).getHours();
      if (!parHeure[heure]) {
        parHeure[heure] = {
          nombre: 0,
          frais: 0,
          gains: 0
        };
      }
      const frais = parseFloat(commande.frais_livraison) || 0;
      parHeure[heure].nombre++;
      parHeure[heure].frais += frais;
      parHeure[heure].gains += frais * TAUX_LIVREUR;
    });

    Object.keys(parHeure)
      .sort((a, b) => b - a)
      .forEach(heure => {
        const data = parHeure[heure];
        console.log(`   ${String(heure).padStart(2, '0')}h: ${data.nombre} livraisons - ${data.gains.toFixed(2)}€ de gains`);
      });

    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 NOTES:');
    console.log(`   • Taux de rémunération: ${(TAUX_LIVREUR * 100).toFixed(0)}% des frais de livraison`);
    console.log(`   • Bonus nuit (20h-6h): +${BONUS_NUIT.toFixed(2)}€ par livraison`);
    console.log(`   • Ces calculs sont basés sur les commandes livrées uniquement`);
    console.log('\n✅ Calcul terminé !\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    console.error('Stack:', error.stack);
  }
}

// Exécuter le script
calculerGainsLivreurs()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });


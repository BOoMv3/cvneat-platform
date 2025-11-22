/**
 * Script de diagnostic pour voir les commandes de ce soir
 * et identifier pourquoi les frais de livraison ne sont pas calculés
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnostic() {
  console.log('🔍 === DIAGNOSTIC DES COMMANDES DE CE SOIR ===\n');

  const aujourd_hui = new Date().toISOString().split('T')[0];
  console.log(`📅 Date: ${aujourd_hui}\n`);

  // Récupérer toutes les commandes
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
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  if (!commandes || commandes.length === 0) {
    console.log('ℹ️ Aucune commande trouvée');
    return;
  }

  console.log(`📊 ${commandes.length} commandes trouvées\n`);
  console.log('═'.repeat(100));

  commandes.forEach((cmd, index) => {
    const heure = new Date(cmd.created_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    console.log(`\n${index + 1}. Commande ${cmd.id.substring(0, 8)}...`);
    console.log(`   ⏰ Heure: ${heure}`);
    console.log(`   📍 Statut: ${cmd.statut}`);
    console.log(`   🏪 Restaurant: ${cmd.restaurants?.nom || 'N/A'}`);
    console.log(`   💰 Total: ${cmd.total ? `${parseFloat(cmd.total).toFixed(2)}€` : 'N/A'}`);
    console.log(`   🚚 Frais livraison: ${cmd.frais_livraison ? `${parseFloat(cmd.frais_livraison).toFixed(2)}€` : '❌ NON RENSEIGNÉ'}`);
    console.log(`   👤 Livreur ID: ${cmd.livreur_id || '❌ Aucun'}`);
    console.log(`   📮 Adresse: ${cmd.adresse_livraison || 'N/A'}`);
  });

  console.log('\n' + '═'.repeat(100));

  // Statistiques
  const avecFrais = commandes.filter(c => c.frais_livraison && parseFloat(c.frais_livraison) > 0);
  const sansFrais = commandes.filter(c => !c.frais_livraison || parseFloat(c.frais_livraison) === 0);
  const avecLivreur = commandes.filter(c => c.livreur_id);
  const livrees = commandes.filter(c => c.statut === 'livree');

  console.log('\n📊 RÉSUMÉ:');
  console.log(`   Total commandes: ${commandes.length}`);
  console.log(`   Livrées: ${livrees.length}`);
  console.log(`   Avec frais de livraison: ${avecFrais.length} ✅`);
  console.log(`   Sans frais de livraison: ${sansFrais.length} ❌`);
  console.log(`   Avec livreur assigné: ${avecLivreur.length}`);

  if (avecFrais.length > 0) {
    const totalFrais = avecFrais.reduce((sum, c) => sum + parseFloat(c.frais_livraison), 0);
    const gainsLivreur80 = totalFrais * 0.80;
    const gainsLivreur100 = totalFrais;

    console.log('\n💰 CALCUL DES GAINS (si applicable):');
    console.log(`   Total frais de livraison: ${totalFrais.toFixed(2)}€`);
    console.log(`   Gains livreur (80%): ${gainsLivreur80.toFixed(2)}€`);
    console.log(`   Gains livreur (100%): ${gainsLivreur100.toFixed(2)}€`);
  }

  if (sansFrais.length > 0) {
    console.log('\n⚠️ PROBLÈME DÉTECTÉ:');
    console.log(`   ${sansFrais.length} commande(s) sans frais de livraison`);
    console.log('   Causes possibles:');
    console.log('   1. Les frais ne sont pas enregistrés lors de la création de commande');
    console.log('   2. Le champ frais_livraison est NULL dans la base de données');
    console.log('   3. Bug dans l\'API de création de commande');
    console.log('\n   💡 Solution:');
    console.log('   - Vérifier le code de création de commande');
    console.log('   - S\'assurer que frais_livraison est bien enregistré');
    console.log('   - Mettre à jour manuellement si nécessaire');
  }

  console.log('\n✅ Diagnostic terminé\n');
}

diagnostic()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });


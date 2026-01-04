#!/usr/bin/env node

/**
 * Script pour tester ce que l'API /api/restaurants retourne pour Smaash Burger
 */

require('dotenv').config({ path: '.env.local' });

async function testAPI() {
  try {
    // Utiliser l'URL locale si disponible, sinon utiliser l'URL de production
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    console.log(`🔍 Test de l'API: ${baseUrl}/api/restaurants`);
    
    const response = await fetch(`${baseUrl}/api/restaurants`);
    
    if (!response.ok) {
      console.error(`❌ Erreur API: ${response.status} ${response.statusText}`);
      process.exit(1);
    }
    
    const restaurants = await response.json();
    console.log(`\n📊 ${restaurants.length} restaurants récupérés`);
    
    const smaash = restaurants.find(r => r.nom && (r.nom.toLowerCase().includes('smaash') || r.nom.toLowerCase().includes('smaash burger')));
    
    if (!smaash) {
      console.error('❌ Smaash Burger non trouvé dans la réponse API');
      process.exit(1);
    }
    
    console.log(`\n✅ Smaash Burger trouvé:`);
    console.log(`   Nom: ${smaash.nom}`);
    console.log(`   ID: ${smaash.id}`);
    console.log(`   ferme_manuellement: ${smaash.ferme_manuellement} (type: ${typeof smaash.ferme_manuellement})`);
    console.log(`   ferme_manuellement === false: ${smaash.ferme_manuellement === false}`);
    console.log(`   ferme_manuellement === true: ${smaash.ferme_manuellement === true}`);
    
    if (smaash.horaires) {
      let horaires = smaash.horaires;
      if (typeof horaires === 'string') {
        horaires = JSON.parse(horaires);
      }
      console.log(`\n📅 Horaires lundi:`, horaires.lundi || horaires.Lundi || horaires.LUNDI || 'NON TROUVÉ');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 L\'application n\'est pas en cours d\'exécution sur cette URL.');
      console.error('   Essayez de tester directement depuis le navigateur sur https://cvneat.fr');
    }
    process.exit(1);
  }
}

testAPI();

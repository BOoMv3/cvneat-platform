#!/usr/bin/env node

/**
 * Script principal pour exécuter tous les tests
 */

const { runAllTests } = require('./test-complete-flow');
const { testAPIRoutes } = require('./test-api-routes');
const { testStatusTransitions, testStatusValidation } = require('./test-statuts');

async function runAllTestsSuite() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 SUITE DE TESTS COMPLÈTE - CVN\'EAT');
  console.log('='.repeat(70) + '\n');

  const results = {
    completeFlow: null,
    apiRoutes: null,
    statusValidation: null,
    statusTransitions: null
  };

  // 1. Tests de validation des statuts
  console.log('📋 PHASE 1: Tests de validation des statuts');
  console.log('─'.repeat(70));
  results.statusValidation = testStatusValidation();
  results.statusTransitions = testStatusTransitions();

  // 2. Tests des routes API
  console.log('\n📋 PHASE 2: Tests des routes API');
  console.log('─'.repeat(70));
  results.apiRoutes = await testAPIRoutes();

  // 3. Tests du flux complet
  console.log('\n📋 PHASE 3: Tests du flux complet');
  console.log('─'.repeat(70));
  results.completeFlow = await runAllTests();

  // Rapport final
  console.log('\n' + '='.repeat(70));
  console.log('📊 RAPPORT FINAL DES TESTS');
  console.log('='.repeat(70));

  const totalPassed = 
    (results.statusValidation?.passed || 0) +
    (results.statusTransitions?.passed || 0) +
    (results.completeFlow?.passed || 0);
  
  const totalFailed = 
    (results.statusValidation?.failed || 0) +
    (results.statusTransitions?.failed || 0) +
    (results.completeFlow?.failed || 0);

  console.log(`\n✅ Total tests réussis: ${totalPassed}`);
  console.log(`❌ Total tests échoués: ${totalFailed}`);
  console.log(`📈 Taux de réussite: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(70));
  
  // Code de sortie
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Exécuter si appelé directement
if (require.main === module) {
  runAllTestsSuite().catch(error => {
    console.error('❌ Erreur lors de l\'exécution des tests:', error);
    process.exit(1);
  });
}

module.exports = { runAllTestsSuite };


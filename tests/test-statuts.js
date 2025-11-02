/**
 * Tests de validation des statuts
 */

const validStatuses = [
  'en_attente',
  'acceptee',
  'refusee',
  'en_preparation',
  'pret_a_livrer',
  'en_livraison',
  'livree',
  'annulee'
];

const statusTransitions = {
  'en_attente': ['acceptee', 'refusee', 'annulee'],
  'acceptee': ['en_preparation', 'refusee', 'annulee'],
  'en_preparation': ['pret_a_livrer', 'refusee', 'annulee'],
  'pret_a_livrer': ['en_livraison', 'annulee'],
  'en_livraison': ['livree', 'annulee'],
  'livree': [], // État final
  'refusee': [], // État final
  'annulee': [] // État final
};

/**
 * Vérifie qu'un statut est valide
 */
function isValidStatus(status) {
  return validStatuses.includes(status);
}

/**
 * Vérifie qu'une transition de statut est valide
 */
function isValidTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) {
    return false;
  }
  
  const allowed = statusTransitions[from] || [];
  return allowed.includes(to);
}

/**
 * Teste toutes les transitions valides
 */
function testStatusTransitions() {
  console.log('\n🔄 TEST DES TRANSITIONS DE STATUT\n');

  const testCases = [
    { from: 'en_attente', to: 'acceptee', expected: true },
    { from: 'en_attente', to: 'refusee', expected: true },
    { from: 'acceptee', to: 'en_preparation', expected: true },
    { from: 'en_preparation', to: 'pret_a_livrer', expected: true },
    { from: 'pret_a_livrer', to: 'en_livraison', expected: true },
    { from: 'en_livraison', to: 'livree', expected: true },
    // Transitions invalides
    { from: 'livree', to: 'en_attente', expected: false },
    { from: 'en_attente', to: 'livree', expected: false },
    { from: 'refusee', to: 'acceptee', expected: false }
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach(test => {
    const result = isValidTransition(test.from, test.to);
    const icon = result === test.expected ? '✅' : '❌';
    const status = result === test.expected ? 'OK' : 'ÉCHOUÉ';
    
    console.log(`${icon} ${test.from} → ${test.to}: ${status} (attendu: ${test.expected})`);
    
    if (result === test.expected) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log(`\n📊 Résultats: ${passed} réussis, ${failed} échoués`);
  return { passed, failed };
}

/**
 * Teste la validation des statuts
 */
function testStatusValidation() {
  console.log('\n✅ TEST DE VALIDATION DES STATUTS\n');

  const validTests = validStatuses.map(status => ({
    status,
    expected: true
  }));

  const invalidTests = [
    { status: 'pending', expected: false },
    { status: 'accepted', expected: false },
    { status: 'invalid_status', expected: false },
    { status: '', expected: false },
    { status: null, expected: false }
  ];

  let passed = 0;
  let failed = 0;

  [...validTests, ...invalidTests].forEach(test => {
    const result = isValidStatus(test.status);
    const icon = result === test.expected ? '✅' : '❌';
    
    console.log(`${icon} "${test.status}": ${result ? 'valide' : 'invalide'} (attendu: ${test.expected ? 'valide' : 'invalide'})`);
    
    if (result === test.expected) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log(`\n📊 Résultats: ${passed} réussis, ${failed} échoués`);
  return { passed, failed };
}

if (require.main === module) {
  testStatusValidation();
  testStatusTransitions();
}

module.exports = { isValidStatus, isValidTransition, testStatusTransitions, testStatusValidation };


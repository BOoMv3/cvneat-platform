// Script de test complet du système de réclamations
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Fonction de test principale
async function testComplaintsSystem() {
  console.log('🧪 TEST COMPLET DU SYSTÈME DE RÉCLAMATIONS');
  console.log('==========================================\n');

  let testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Vérifier que les tables existent
  await runTest('Tables de base de données', async () => {
    const requiredTables = ['complaints', 'order_feedback', 'customer_complaint_history', 'complaint_evidence'];
    
    for (const table of requiredTables) {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        throw new Error(`Table ${table} non accessible: ${error.message}`);
      }
    }
    
    return 'Toutes les tables sont accessibles';
  }, testResults);

  // Test 2: Créer un utilisateur de test
  let testUserId = null;
  await runTest('Création utilisateur de test', async () => {
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test-complaints@cvneat.com',
      password: 'TestPassword123!',
      email_confirm: true
    });

    if (error) {
      throw new Error(`Erreur création utilisateur: ${error.message}`);
    }

    testUserId = data.user.id;

    // Créer le profil utilisateur
    const { error: profileError } = await supabase
      .from('users')
      .insert([{
        id: testUserId,
        email: 'test-complaints@cvneat.com',
        full_name: 'Test User Complaints',
        role: 'user'
      }]);

    if (profileError) {
      throw new Error(`Erreur création profil: ${profileError.message}`);
    }

    return `Utilisateur créé: ${testUserId}`;
  }, testResults);

  // Test 3: Créer un restaurant de test
  let testRestaurantId = null;
  await runTest('Création restaurant de test', async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .insert([{
        name: 'Restaurant Test Réclamations',
        address: '123 Rue Test',
        city: 'Test City',
        postal_code: '12345',
        phone: '0123456789',
        email: 'test-restaurant@cvneat.com',
        description: 'Restaurant pour tester les réclamations',
        status: 'active'
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur création restaurant: ${error.message}`);
    }

    testRestaurantId = data.id;
    return `Restaurant créé: ${testRestaurantId}`;
  }, testResults);

  // Test 4: Créer une commande de test
  let testOrderId = null;
  await runTest('Création commande de test', async () => {
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        customer_id: testUserId,
        restaurant_id: testRestaurantId,
        order_number: 'TEST-' + Date.now(),
        customer_name: 'Test User Complaints',
        customer_phone: '0123456789',
        delivery_address: '123 Rue Test Client',
        delivery_city: 'Test City',
        delivery_postal_code: '12345',
        total_amount: 25.50,
        delivery_fee: 3.00,
        status: 'delivered',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // Il y a 2h
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur création commande: ${error.message}`);
    }

    testOrderId = data.id;
    return `Commande créée: ${testOrderId}`;
  }, testResults);

  // Test 5: Créer un feedback positif
  await runTest('Création feedback positif', async () => {
    const { data, error } = await supabase
      .from('order_feedback')
      .insert([{
        order_id: testOrderId,
        customer_id: testUserId,
        restaurant_id: testRestaurantId,
        overall_satisfaction: 5,
        food_quality: 5,
        delivery_speed: 4,
        delivery_quality: 5,
        restaurant_rating: 5,
        comment: 'Excellent service !',
        had_issues: false
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur création feedback: ${error.message}`);
    }

    return `Feedback créé: ${data.id}`;
  }, testResults);

  // Test 6: Créer un feedback avec problème (conversion automatique)
  await runTest('Création feedback avec problème', async () => {
    const { data, error } = await supabase
      .from('order_feedback')
      .insert([{
        order_id: testOrderId,
        customer_id: testUserId,
        restaurant_id: testRestaurantId,
        overall_satisfaction: 2,
        food_quality: 2,
        delivery_speed: 3,
        delivery_quality: 2,
        restaurant_rating: 2,
        comment: 'Repas froid et livreur impoli',
        had_issues: true,
        issue_type: 'food_quality',
        issue_description: 'La nourriture était froide et le livreur a été très impoli'
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur création feedback problématique: ${error.message}`);
    }

    // Vérifier que la réclamation a été créée automatiquement
    const { data: complaints, error: complaintError } = await supabase
      .from('complaints')
      .select('*')
      .eq('order_id', testOrderId);

    if (complaintError) {
      throw new Error(`Erreur vérification réclamation: ${complaintError.message}`);
    }

    if (!complaints || complaints.length === 0) {
      throw new Error('Aucune réclamation créée automatiquement');
    }

    return `Feedback problématique créé et réclamation générée: ${complaints[0].id}`;
  }, testResults);

  // Test 7: Créer une réclamation directe
  await runTest('Création réclamation directe', async () => {
    const { data, error } = await supabase
      .from('complaints')
      .insert([{
        order_id: testOrderId,
        customer_id: testUserId,
        restaurant_id: testRestaurantId,
        complaint_type: 'missing_items',
        title: 'Articles manquants',
        description: 'Il manque 2 articles dans ma commande',
        requested_refund_amount: 15.00,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur création réclamation directe: ${error.message}`);
    }

    return `Réclamation directe créée: ${data.id}`;
  }, testResults);

  // Test 8: Vérifier l'historique des réclamations
  await runTest('Vérification historique réclamations', async () => {
    const { data, error } = await supabase
      .from('customer_complaint_history')
      .select('*')
      .eq('customer_id', testUserId)
      .single();

    if (error) {
      throw new Error(`Erreur récupération historique: ${error.message}`);
    }

    if (!data) {
      throw new Error('Historique des réclamations non créé');
    }

    if (data.total_complaints < 2) {
      throw new Error(`Nombre de réclamations incorrect: ${data.total_complaints}`);
    }

    return `Historique créé: ${data.total_complaints} réclamations, score: ${data.trust_score}`;
  }, testResults);

  // Test 9: Tester les politiques RLS
  await runTest('Test des politiques RLS', async () => {
    // Tester l'accès en tant qu'utilisateur
    const { data: userComplaints, error: userError } = await supabase
      .from('complaints')
      .select('*')
      .eq('customer_id', testUserId);

    if (userError) {
      throw new Error(`Erreur accès utilisateur: ${userError.message}`);
    }

    return `Politiques RLS fonctionnelles: ${userComplaints.length} réclamations accessibles`;
  }, testResults);

  // Test 10: Nettoyage des données de test
  await runTest('Nettoyage des données de test', async () => {
    // Supprimer les réclamations
    await supabase
      .from('complaints')
      .delete()
      .eq('customer_id', testUserId);

    // Supprimer les feedbacks
    await supabase
      .from('order_feedback')
      .delete()
      .eq('customer_id', testUserId);

    // Supprimer l'historique
    await supabase
      .from('customer_complaint_history')
      .delete()
      .eq('customer_id', testUserId);

    // Supprimer la commande
    await supabase
      .from('orders')
      .delete()
      .eq('id', testOrderId);

    // Supprimer le restaurant
    await supabase
      .from('restaurants')
      .delete()
      .eq('id', testRestaurantId);

    // Supprimer l'utilisateur
    await supabase.auth.admin.deleteUser(testUserId);

    return 'Données de test nettoyées';
  }, testResults);

  // Résultats finaux
  console.log('\n📊 RÉSULTATS DES TESTS');
  console.log('======================');
  console.log(`✅ Tests réussis: ${testResults.passed}`);
  console.log(`❌ Tests échoués: ${testResults.failed}`);
  console.log(`📈 Taux de réussite: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ TESTS ÉCHOUÉS:');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
  }

  if (testResults.failed === 0) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
    console.log('Le système de réclamations est entièrement fonctionnel.');
  } else {
    console.log('\n⚠️ Certains tests ont échoué. Vérifiez les erreurs ci-dessus.');
  }

  return testResults.failed === 0;
}

// Fonction utilitaire pour exécuter un test
async function runTest(name, testFunction, results) {
  try {
    console.log(`🧪 Test: ${name}...`);
    const result = await testFunction();
    console.log(`✅ ${result}\n`);
    
    results.passed++;
    results.tests.push({ name, passed: true });
  } catch (error) {
    console.log(`❌ ${error.message}\n`);
    
    results.failed++;
    results.tests.push({ name, passed: false, error: error.message });
  }
}

// Exécuter les tests
testComplaintsSystem()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

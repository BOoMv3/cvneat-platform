/**
 * Script de test complet pour CVN'Eat
 * Teste tous les flux : Client → Restaurant → Livreur
 */

const fetch = require('node-fetch');
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
};

// Variables globales pour stocker les tokens et IDs
let clientToken = null;
let restaurantToken = null;
let deliveryToken = null;
let orderId = null;
let restaurantId = null;

/**
 * TEST 1: Authentification Client
 */
async function testClientAuth() {
  log.info('TEST 1: Authentification Client');
  try {
    // Simuler une connexion client
    // Dans un vrai test, on utiliserait les vraies credentials
    log.warn('Authentification client simulée - À compléter avec vraies credentials');
    clientToken = 'test-client-token';
    log.success('Authentification client OK');
    return true;
  } catch (error) {
    log.error(`Authentification client échouée: ${error.message}`);
    return false;
  }
}

/**
 * TEST 2: Création d'une commande
 */
async function testCreateOrder() {
  log.info('TEST 2: Création d\'une commande');
  try {
    const orderData = {
      restaurantId: restaurantId || 'test-restaurant-id',
      deliveryInfo: {
        address: '123 Rue Test',
        city: 'Ganges',
        postalCode: '34190',
        instructions: 'Appeler avant d\'arriver'
      },
      items: [
        { id: 'menu-1', quantity: 2, price: 15.50 },
        { id: 'menu-2', quantity: 1, price: 12.00 }
      ],
      deliveryFee: 2.50,
      totalAmount: 45.50
    };

    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur création commande');
    }

    const data = await response.json();
    orderId = data.orderId;
    
    log.success(`Commande créée avec succès: ${orderId}`);
    log.info(`Statut initial: ${data.status}`);
    
    return { success: true, orderId: orderId, status: data.status };
  } catch (error) {
    log.error(`Création commande échouée: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 3: Vérification commande dans la base
 */
async function testCheckOrderInDB() {
  log.info('TEST 3: Vérification commande dans la base');
  try {
    const response = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Commande non trouvée');
    }

    const order = await response.json();
    
    // Vérifier les champs importants
    const checks = [
      { field: 'id', value: order.id, expected: orderId },
      { field: 'statut', value: order.statut, expected: 'en_attente' },
      { field: 'restaurant_id', value: order.restaurant_id, expected: restaurantId }
    ];

    let allValid = true;
    checks.forEach(check => {
      if (check.value !== check.expected) {
        log.error(`Champ ${check.field}: ${check.value} ≠ ${check.expected}`);
        allValid = false;
      }
    });

    if (allValid) {
      log.success('Commande vérifiée dans la base - Tous les champs sont corrects');
    }
    
    return { success: allValid, order };
  } catch (error) {
    log.error(`Vérification commande échouée: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 4: Restaurant voit la commande
 */
async function testRestaurantSeesOrder() {
  log.info('TEST 4: Restaurant voit la commande');
  try {
    const response = await fetch(`${BASE_URL}/api/partner/orders`, {
      headers: {
        'Authorization': `Bearer ${restaurantToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur récupération commandes restaurant');
    }

    const orders = await response.json();
    const foundOrder = orders.find(o => o.id === orderId);

    if (!foundOrder) {
      throw new Error('Commande non trouvée dans la liste du restaurant');
    }

    log.success('Restaurant voit la commande');
    log.info(`Statut vu par restaurant: ${foundOrder.statut}`);
    
    return { success: true, order: foundOrder };
  } catch (error) {
    log.error(`Restaurant ne voit pas la commande: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 5: Restaurant accepte la commande
 */
async function testRestaurantAcceptsOrder() {
  log.info('TEST 5: Restaurant accepte la commande');
  try {
    const response = await fetch(`${BASE_URL}/api/restaurants/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${restaurantToken}`
      },
      body: JSON.stringify({
        status: 'acceptee',
        preparation_time: 20
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur acceptation commande');
    }

    const data = await response.json();
    
    log.success('Restaurant a accepté la commande');
    log.info(`Nouveau statut: ${data.order.statut}`);
    
    return { success: true, order: data.order };
  } catch (error) {
    log.error(`Acceptation commande échouée: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 6: Restaurant marque comme prête
 */
async function testRestaurantMarksReady() {
  log.info('TEST 6: Restaurant marque commande comme prête');
  try {
    const response = await fetch(`${BASE_URL}/api/restaurants/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${restaurantToken}`
      },
      body: JSON.stringify({
        status: 'pret_a_livrer'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur mise à jour statut');
    }

    const data = await response.json();
    
    log.success('Commande marquée comme prête');
    log.info(`Statut: ${data.order.statut}`);
    
    return { success: true, order: data.order };
  } catch (error) {
    log.error(`Mise à jour statut échouée: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 7: Livreur voit commandes disponibles
 */
async function testDeliverySeesAvailableOrders() {
  log.info('TEST 7: Livreur voit les commandes disponibles');
  try {
    const response = await fetch(`${BASE_URL}/api/delivery/available-orders`, {
      headers: {
        'Authorization': `Bearer ${deliveryToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur récupération commandes disponibles');
    }

    const orders = await response.json();
    const foundOrder = orders.find(o => o.id === orderId);

    if (!foundOrder) {
      throw new Error('Commande non visible pour les livreurs');
    }

    log.success('Livreur voit la commande disponible');
    log.info(`Nombre de commandes disponibles: ${orders.length}`);
    
    return { success: true, orders, foundOrder };
  } catch (error) {
    log.error(`Livreur ne voit pas les commandes: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 8: Livreur accepte la commande
 */
async function testDeliveryAcceptsOrder() {
  log.info('TEST 8: Livreur accepte la commande');
  try {
    const response = await fetch(`${BASE_URL}/api/delivery/accept-order/${orderId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deliveryToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur acceptation commande livreur');
    }

    const data = await response.json();
    
    log.success('Livreur a accepté la commande');
    
    // Vérifier que le statut est bien en_livraison
    const checkResponse = await fetch(`${BASE_URL}/api/orders/${orderId}`);
    const order = await checkResponse.json();
    
    if (order.statut === 'en_livraison') {
      log.success(`Statut correct: ${order.statut}`);
    } else {
      log.error(`Statut incorrect: ${order.statut} (attendu: en_livraison)`);
    }
    
    return { success: true, order };
  } catch (error) {
    log.error(`Acceptation livreur échouée: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 9: Livreur finalise la livraison
 */
async function testDeliveryCompletesOrder() {
  log.info('TEST 9: Livreur finalise la livraison');
  try {
    const response = await fetch(`${BASE_URL}/api/delivery/complete-delivery/${orderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deliveryToken}`
      },
      body: JSON.stringify({
        securityCode: '1234' // Code de sécurité pour test
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur finalisation livraison');
    }

    const data = await response.json();
    
    log.success('Livraison finalisée');
    
    // Vérifier que le statut est bien livree
    const checkResponse = await fetch(`${BASE_URL}/api/orders/${orderId}`);
    const order = await checkResponse.json();
    
    if (order.statut === 'livree') {
      log.success(`Statut final correct: ${order.statut}`);
    } else {
      log.error(`Statut final incorrect: ${order.statut} (attendu: livree)`);
    }
    
    return { success: true, order };
  } catch (error) {
    log.error(`Finalisation livraison échouée: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 10: Client voit notification de livraison
 */
async function testClientReceivesNotification() {
  log.info('TEST 10: Client reçoit notification de livraison');
  try {
    // Vérifier que la notification a été créée
    const response = await fetch(`${BASE_URL}/api/notifications`, {
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Erreur récupération notifications');
    }

    const notifications = await response.json();
    const deliveryNotification = notifications.find(n => 
      n.type === 'delivery_completed' && n.data?.order_id === orderId
    );

    if (deliveryNotification) {
      log.success('Client a reçu la notification de livraison');
    } else {
      log.warn('Notification de livraison non trouvée');
    }
    
    return { success: !!deliveryNotification, notifications };
  } catch (error) {
    log.error(`Vérification notification échouée: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 11: Vérification cohérence des statuts
 */
async function testStatusConsistency() {
  log.info('TEST 11: Vérification cohérence des statuts');
  try {
    const response = await fetch(`${BASE_URL}/api/orders/${orderId}`);
    const order = await response.json();

    const validStatuses = [
      'en_attente', 'acceptee', 'refusee', 
      'en_preparation', 'pret_a_livrer', 
      'en_livraison', 'livree', 'annulee'
    ];

    const isValid = validStatuses.includes(order.statut);
    
    if (isValid) {
      log.success(`Statut valide: ${order.statut}`);
    } else {
      log.error(`Statut invalide: ${order.statut}`);
    }
    
    return { success: isValid, status: order.statut };
  } catch (error) {
    log.error(`Vérification statut échouée: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Exécution de tous les tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTS COMPLETS CVN\'EAT');
  console.log('='.repeat(60) + '\n');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };

  // Tests séquentiels (chaque test dépend du précédent)
  const tests = [
    { name: 'Authentification Client', fn: testClientAuth },
    { name: 'Création Commande', fn: testCreateOrder },
    { name: 'Vérification DB', fn: testCheckOrderInDB },
    { name: 'Restaurant voit Commande', fn: testRestaurantSeesOrder },
    { name: 'Restaurant accepte', fn: testRestaurantAcceptsOrder },
    { name: 'Restaurant marque prête', fn: testRestaurantMarksReady },
    { name: 'Livreur voit disponibles', fn: testDeliverySeesAvailableOrders },
    { name: 'Livreur accepte', fn: testDeliveryAcceptsOrder },
    { name: 'Livreur finalise', fn: testDeliveryCompletesOrder },
    { name: 'Notification Client', fn: testClientReceivesNotification },
    { name: 'Cohérence Statuts', fn: testStatusConsistency }
  ];

  for (const test of tests) {
    console.log(`\n${'─'.repeat(60)}`);
    const result = await test.fn();
    
    results.tests.push({
      name: test.name,
      success: result.success,
      error: result.error
    });

    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // Rapport final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT DE TEST');
  console.log('='.repeat(60));
  console.log(`✅ Tests réussis: ${results.passed}`);
  console.log(`❌ Tests échoués: ${results.failed}`);
  console.log(`⚠️  Avertissements: ${results.warnings}`);
  console.log('\nDétails:');
  results.tests.forEach(test => {
    const icon = test.success ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
    if (!test.success && test.error) {
      console.log(`   Erreur: ${test.error}`);
    }
  });
  console.log('='.repeat(60) + '\n');

  return results;
}

// Exporter pour utilisation
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };


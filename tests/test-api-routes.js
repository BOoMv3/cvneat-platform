/**
 * Tests des routes API individuelles
 */

const fetch = require('node-fetch');
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

/**
 * Test des routes API principales
 */
async function testAPIRoutes() {
  console.log('\n🔍 TEST DES ROUTES API\n');

  const routes = [
    {
      name: 'GET /api/delivery/available-orders',
      method: 'GET',
      url: '/api/delivery/available-orders',
      requiresAuth: true,
      role: 'delivery'
    },
    {
      name: 'GET /api/delivery/current-order',
      method: 'GET',
      url: '/api/delivery/current-order',
      requiresAuth: true,
      role: 'delivery'
    },
    {
      name: 'GET /api/delivery/my-orders',
      method: 'GET',
      url: '/api/delivery/my-orders',
      requiresAuth: true,
      role: 'delivery'
    },
    {
      name: 'GET /api/delivery/stats',
      method: 'GET',
      url: '/api/delivery/stats',
      requiresAuth: true,
      role: 'delivery'
    },
    {
      name: 'GET /api/partner/orders',
      method: 'GET',
      url: '/api/partner/orders',
      requiresAuth: true,
      role: 'restaurant'
    }
  ];

  const results = [];

  for (const route of routes) {
    try {
      log.info(`Test: ${route.name}`);
      
      const response = await fetch(`${BASE_URL}${route.url}`, {
        method: route.method,
        headers: {
          'Content-Type': 'application/json',
          // Note: Dans un vrai test, on utiliserait de vrais tokens
          'Authorization': route.requiresAuth ? 'Bearer test-token' : undefined
        }
      });

      // Pour les routes nécessitant une auth, on s'attend à 401/403
      if (route.requiresAuth && (response.status === 401 || response.status === 403)) {
        log.success(`${route.name}: Protection d'authentification OK`);
        results.push({ route: route.name, status: 'protected', httpStatus: response.status });
      } else if (!route.requiresAuth && response.ok) {
        log.success(`${route.name}: OK (${response.status})`);
        results.push({ route: route.name, status: 'ok', httpStatus: response.status });
      } else {
        log.error(`${route.name}: Statut inattendu (${response.status})`);
        results.push({ route: route.name, status: 'unexpected', httpStatus: response.status });
      }
    } catch (error) {
      log.error(`${route.name}: Erreur - ${error.message}`);
      results.push({ route: route.name, status: 'error', error: error.message });
    }
  }

  console.log('\n📊 Résultats:');
  results.forEach(r => {
    const icon = r.status === 'ok' || r.status === 'protected' ? '✅' : '❌';
    console.log(`${icon} ${r.route}: ${r.status} (${r.httpStatus || 'N/A'})`);
  });

  return results;
}

module.exports = { testAPIRoutes };


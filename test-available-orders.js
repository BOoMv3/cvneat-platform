// Test des commandes disponibles
// Exécuter ce script dans la console du navigateur sur /delivery/dashboard

console.log('🔍 Test des commandes disponibles...');

const token = localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token');

if (!token) {
  console.error('❌ Aucun token trouvé');
} else {
  console.log('✅ Token trouvé');
  
  // Test available-orders
  fetch('/api/delivery/available-orders', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    console.log('📡 Statut available-orders:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('📊 Commandes disponibles:', data);
    console.log('📈 Nombre de commandes:', data?.length);
    if (data && data.length > 0) {
      data.forEach((order, index) => {
        console.log(`  ${index + 1}. Commande #${order.id}, Statut: ${order.status}, Restaurant: ${order.restaurant?.nom}`);
      });
    }
  })
  .catch(error => {
    console.error('❌ Erreur available-orders:', error);
  });
}

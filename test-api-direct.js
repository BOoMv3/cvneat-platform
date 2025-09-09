// Test direct de l'API des alertes de préparation
// À exécuter dans la console du navigateur sur le dashboard livreur

console.log('🔔 Test direct de l\'API des alertes...');

// Fonction pour tester l'API
async function testAPI() {
  try {
    // Récupérer le token depuis le localStorage
    const token = localStorage.getItem('token');
    console.log('🔑 Token trouvé:', token ? 'Oui' : 'Non');
    
    if (!token) {
      console.error('❌ Aucun token trouvé dans localStorage');
      return;
    }
    
    // Appeler l'API
    console.log('📡 Appel de l\'API...');
    const response = await fetch('/api/delivery/preparation-alerts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Statut:', response.status);
    console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📊 Données reçues:', data);
    
    if (data.success) {
      console.log(`✅ ${data.alerts?.length || 0} alerte(s) trouvée(s)`);
      
      if (data.alerts && data.alerts.length > 0) {
        console.log('🚨 Alertes détaillées:');
        data.alerts.forEach((alert, index) => {
          console.log(`  ${index + 1}. Commande #${alert.order_id}:`);
          console.log(`     - Client: ${alert.customer_name}`);
          console.log(`     - Restaurant: ${alert.restaurant_name}`);
          console.log(`     - Temps restant: ${alert.time_remaining_minutes} min`);
          console.log(`     - Code: ${alert.security_code}`);
        });
      } else {
        console.log('ℹ️ Aucune alerte trouvée');
      }
    } else {
      console.error('❌ Erreur dans la réponse:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel API:', error);
  }
}

// Exécuter le test
testAPI();

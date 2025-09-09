// Test de l'API avec logs détaillés
// À exécuter dans la console du navigateur sur le dashboard livreur

console.log('🔔 Test de l\'API avec logs détaillés...');

// Fonction pour tester l'API
async function testAPIWithLogs() {
  try {
    const token = JSON.parse(localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token')).access_token;
    
    console.log('📡 Appel de l\'API des alertes...');
    console.log('🔑 Token (premiers caractères):', token.substring(0, 50) + '...');
    
    const response = await fetch('/api/delivery/preparation-alerts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Statut:', response.status);
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
        console.log('🔍 Vérifications à faire :');
        console.log('  1. L\'API trouve-t-elle la commande #2004 ?');
        console.log('  2. Le delivery_id correspond-il ?');
        console.log('  3. Le calcul du temps restant est-il correct ?');
        console.log('  4. Y a-t-il des logs côté serveur ?');
      }
    } else {
      console.error('❌ Erreur dans la réponse:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel API:', error);
  }
}

// Exécuter le test
testAPIWithLogs();

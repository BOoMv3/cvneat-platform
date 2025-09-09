// Test de l'API avec la commande #2004 (0.61 min restantes)
// À exécuter dans la console du navigateur sur le dashboard livreur

console.log('🔔 Test de l\'API avec la commande #2004...');

// Fonction pour tester l'API
async function testAPIWithOrder2004() {
  try {
    const token = JSON.parse(localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token')).access_token;
    
    console.log('📡 Appel de l\'API des alertes...');
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
        console.log('🔍 Diagnostic possible :');
        console.log('  1. L\'API ne trouve pas la commande #2004');
        console.log('  2. Le calcul du temps restant est incorrect');
        console.log('  3. L\'API ne filtre pas correctement par delivery_id');
      }
    } else {
      console.error('❌ Erreur dans la réponse:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel API:', error);
  }
}

// Exécuter le test
testAPIWithOrder2004();

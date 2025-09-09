// Test final de l'API des alertes avec la commande #2008
// À exécuter dans la console du navigateur sur le dashboard livreur

console.log('🔔 Test final de l\'API des alertes...');

// Fonction pour tester l'API
async function testAPIFinal() {
  try {
    const token = JSON.parse(localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token')).access_token;
    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    
    console.log('🔑 Delivery ID du token:', tokenPayload.sub);
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
        console.log('❌ Aucune alerte trouvée');
        console.log('🔍 Diagnostic :');
        console.log('  1. La commande #2008 existe-t-elle ?');
        console.log('  2. A-t-elle le bon delivery_id ?');
        console.log('  3. A-t-elle le statut "preparing" ?');
        console.log('  4. A-t-elle un preparation_time ?');
        console.log('  5. Le temps restant est-il <= 5 minutes ?');
        console.log('  6. Y a-t-il des logs côté serveur ?');
      }
    } else {
      console.error('❌ Erreur dans la réponse:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel API:', error);
  }
}

// Exécuter le test
testAPIFinal();

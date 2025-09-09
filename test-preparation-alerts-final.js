// Script final pour tester l'API des alertes de préparation
// À copier-coller dans la console du navigateur

async function testPreparationAlertsAPI() {
  try {
    console.log('🧪 Test de l\'API des alertes de préparation...');
    
    // Appeler l'API directement
    const response = await fetch('/api/delivery/preparation-alerts', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Réponse API:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('📊 Données reçues:', data);
    
    if (response.ok) {
      console.log(`✅ ${data.alerts?.length || 0} alerte(s) trouvée(s)`);
      if (data.alerts && data.alerts.length > 0) {
        console.log('🔔 Alertes:', data.alerts);
        console.log('🎯 La commande #1000 devrait apparaître dans les alertes !');
      } else {
        console.log('ℹ️ Aucune alerte de préparation trouvée');
        console.log('💡 Vérifiez que la commande #1000 a le statut "preparing" et un delivery_id');
      }
    } else {
      console.error('❌ Erreur API:', data);
    }
    
  } catch (error) {
    console.error('❌ Erreur test API:', error);
  }
}

// Exécuter le test
testPreparationAlertsAPI();

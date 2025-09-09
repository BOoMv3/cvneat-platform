// Script corrigé pour tester l'API des alertes de préparation
// À copier-coller dans la console du navigateur

async function testPreparationAlertsAPI() {
  try {
    console.log('🧪 Test de l\'API des alertes de préparation...');
    
    // Récupérer le token d'authentification depuis la session
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

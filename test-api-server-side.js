// Test de l'API côté serveur pour voir les logs
// À exécuter dans la console du navigateur sur le dashboard livreur

console.log('🔍 Test de l\'API côté serveur...');

// Fonction pour tester l'API et voir les logs
async function testAPIServerSide() {
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
    
    // Vérifier les logs côté serveur
    console.log('🔍 Vérification des logs côté serveur...');
    console.log('  - L\'API devrait afficher "🔔 Récupération alertes préparation pour livreurs"');
    console.log('  - L\'API devrait afficher "🔍 X commandes en préparation trouvées"');
    console.log('  - L\'API devrait afficher "🔍 Commande 2002: X min restantes"');
    console.log('  - L\'API devrait afficher "🚨 Alerte déclenchée pour commande 2002"');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le test
testAPIServerSide();

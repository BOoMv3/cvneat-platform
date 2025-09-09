// Diagnostic des logs serveur pour l'API des alertes
// À exécuter dans la console du navigateur sur le dashboard livreur

console.log('🔍 Diagnostic des logs serveur...');

// Fonction pour tester l'API et voir les logs
async function debugServerLogs() {
  try {
    const token = JSON.parse(localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token')).access_token;
    
    console.log('📡 Appel de l\'API des alertes...');
    console.log('🔑 Delivery ID du token:', JSON.parse(atob(token.split('.')[1])).sub);
    
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
    
    if (data.success && data.count === 0) {
      console.log('❌ L\'API ne trouve aucune commande en préparation');
      console.log('🔍 Diagnostic possible :');
      console.log('  1. L\'API ne trouve pas la commande #2004 dans la base');
      console.log('  2. Le delivery_id ne correspond pas');
      console.log('  3. Le calcul du temps restant est incorrect');
      console.log('  4. La commande n\'a pas le bon statut');
      
      // Vérifier les logs côté serveur
      console.log('🔍 Vérification des logs côté serveur...');
      console.log('  - L\'API devrait afficher "🔔 Récupération alertes préparation pour livreurs"');
      console.log('  - L\'API devrait afficher "🔑 Delivery ID du token: 570c76ba-b097-4380-9fc0-244b366e24c2"');
      console.log('  - L\'API devrait afficher "🔍 X commandes en préparation trouvées"');
      console.log('  - L\'API devrait afficher "🔍 Commande 2004: X min restantes"');
      console.log('  - L\'API devrait afficher "🚨 Alerte déclenchée pour commande 2004"');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le diagnostic
debugServerLogs();

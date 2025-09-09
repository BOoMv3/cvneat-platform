// Diagnostic des logs côté serveur
// À exécuter dans la console du navigateur sur le dashboard livreur

console.log('🔍 Diagnostic des logs côté serveur...');

// Fonction pour tester l'API et voir les logs détaillés
async function debugServerLogs() {
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
    
    // Vérifier si l'API trouve des commandes
    if (data.success && data.count === 0) {
      console.log('❌ L\'API ne trouve aucune commande en préparation');
      console.log('🔍 Vérifications à faire :');
      console.log('  1. La commande #2002 existe-t-elle ?');
      console.log('  2. A-t-elle le statut "preparing" ?');
      console.log('  3. A-t-elle un delivery_id ?');
      console.log('  4. A-t-elle un preparation_time ?');
      console.log('  5. Le temps restant est-il <= 5 minutes ?');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le diagnostic
debugServerLogs();

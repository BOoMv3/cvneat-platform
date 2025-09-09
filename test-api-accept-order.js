// Test de l'API d'acceptation des commandes
// Exécuter ce script dans la console du navigateur sur /delivery/dashboard

console.log('🔍 Test de l\'API d\'acceptation des commandes...');

const token = localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token');

if (!token) {
  console.error('❌ Aucun token trouvé');
} else {
  console.log('✅ Token trouvé');
  
  // Test avec la commande 6002
  fetch('/api/delivery/accept-order/6002', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('📡 Statut de la réponse:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('📊 Données reçues:', data);
    if (data.error) {
      console.error('❌ Erreur API:', data.error);
      console.error('📋 Détails:', data.details);
    } else {
      console.log('✅ Commande acceptée avec succès!');
    }
  })
  .catch(error => {
    console.error('❌ Erreur de connexion:', error);
  });
}

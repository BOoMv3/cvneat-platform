// Test direct de l'API avec fetch
// À exécuter dans la console du navigateur

// Récupérer le token
const token = localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token');
console.log('Token:', token);

// Test direct de l'API
fetch('/api/delivery/preparation-alerts', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Résultat API:', data);
  if (data.alerts && data.alerts.length > 0) {
    console.log('✅ ALERTES TROUVÉES:', data.alerts);
  } else {
    console.log('❌ AUCUNE ALERTE');
  }
})
.catch(error => console.error('Erreur:', error));

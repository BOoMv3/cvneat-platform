// Test API avec simulation Postman
// À exécuter dans la console du navigateur

// 1. Récupérer le token
const token = localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token');
console.log('🔑 Token récupéré:', token ? 'OUI' : 'NON');

// 2. Décoder le token pour voir le delivery_id
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('🔑 Delivery ID du token:', payload.sub);
    console.log('🔑 Email du token:', payload.email);
  } catch (e) {
    console.error('❌ Erreur décodage token:', e);
  }
}

// 3. Test de l'API
console.log('🧪 Test de l\'API...');
fetch('/api/delivery/preparation-alerts', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('📡 Statut:', response.status);
  return response.json();
})
.then(data => {
  console.log('📊 Données:', data);
  if (data.alerts && data.alerts.length > 0) {
    console.log('✅ SUCCÈS! Alertes trouvées:', data.alerts);
  } else {
    console.log('❌ Aucune alerte trouvée');
  }
})
.catch(error => {
  console.error('❌ Erreur:', error);
});

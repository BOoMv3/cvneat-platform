// Test de l'API chat
// Exécuter ce script dans la console du navigateur sur /delivery/dashboard

console.log('🔍 Test de l\'API chat...');

const token = localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token');

if (!token) {
  console.error('❌ Aucun token trouvé');
} else {
  console.log('✅ Token trouvé');
  
  // Test récupération messages
  fetch('/api/chat/6002', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    console.log('📡 Statut récupération messages:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('📊 Messages reçus:', data);
  })
  .catch(error => {
    console.error('❌ Erreur récupération messages:', error);
  });

  // Test envoi message
  fetch('/api/chat/6002', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Test message',
      user_id: JSON.parse(atob(token.split('.')[1])).sub
    })
  })
  .then(response => {
    console.log('📡 Statut envoi message:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('📊 Réponse envoi:', data);
  })
  .catch(error => {
    console.error('❌ Erreur envoi message:', error);
  });
}

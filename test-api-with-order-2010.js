// Test de l'API des alertes avec la commande #2010
// À exécuter dans la console du navigateur sur /delivery/dashboard

console.log('🧪 Test de l\'API des alertes avec la commande #2010');

// Récupérer le token d'authentification
const supabaseToken = localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token');
console.log('🔑 Token trouvé:', supabaseToken ? 'OUI' : 'NON');

if (!supabaseToken) {
  console.error('❌ Aucun token d\'authentification trouvé');
} else {
  // Tester l'API des alertes
  fetch('/api/delivery/preparation-alerts', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${supabaseToken}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('📡 Statut de la réponse:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('📊 Données reçues:', data);
    
    if (data.success && data.alerts && data.alerts.length > 0) {
      console.log('✅ SUCCÈS ! Alertes trouvées:');
      data.alerts.forEach((alert, index) => {
        console.log(`🚨 Alerte ${index + 1}:`, {
          order_id: alert.order_id,
          customer_name: alert.customer_name,
          restaurant_name: alert.restaurant_name,
          time_remaining_minutes: alert.time_remaining_minutes,
          total_price: alert.total_price,
          security_code: alert.security_code
        });
      });
    } else {
      console.log('⚠️ Aucune alerte trouvée');
      console.log('🔍 Détails:', {
        success: data.success,
        alerts_count: data.alerts ? data.alerts.length : 'N/A',
        count: data.count
      });
    }
  })
  .catch(error => {
    console.error('❌ Erreur lors du test:', error);
  });
}

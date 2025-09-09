// Test de l'API avec le bon token Supabase
// À exécuter dans la console du navigateur sur le dashboard livreur

console.log('🔔 Test de l\'API avec le bon token Supabase...');

// Fonction pour extraire le token Supabase
function getSupabaseToken() {
  const authData = localStorage.getItem('sb-jxbgrvlmvnofaxbtcmsw-auth-token');
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      return parsed.access_token;
    } catch (e) {
      console.error('❌ Erreur parsing token Supabase:', e);
      return null;
    }
  }
  return null;
}

// Fonction pour tester l'API
async function testAPIWithCorrectToken() {
  try {
    // Récupérer le token Supabase
    const token = getSupabaseToken();
    console.log('🔑 Token Supabase trouvé:', token ? 'Oui' : 'Non');
    
    if (!token) {
      console.error('❌ Aucun token Supabase trouvé');
      return;
    }
    
    console.log('🔑 Token (premiers caractères):', token.substring(0, 50) + '...');
    
    // Appeler l'API des alertes
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
    
    if (data.success) {
      console.log(`✅ ${data.alerts?.length || 0} alerte(s) trouvée(s)`);
      
      if (data.alerts && data.alerts.length > 0) {
        console.log('🚨 Alertes détaillées:');
        data.alerts.forEach((alert, index) => {
          console.log(`  ${index + 1}. Commande #${alert.order_id}:`);
          console.log(`     - Client: ${alert.customer_name}`);
          console.log(`     - Restaurant: ${alert.restaurant_name}`);
          console.log(`     - Temps restant: ${alert.time_remaining_minutes} min`);
          console.log(`     - Code: ${alert.security_code}`);
        });
      } else {
        console.log('ℹ️ Aucune alerte trouvée');
      }
    } else {
      console.error('❌ Erreur dans la réponse:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel API:', error);
  }
}

// Exécuter le test
testAPIWithCorrectToken();

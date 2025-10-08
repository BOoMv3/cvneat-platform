// SCRIPT POUR TESTER L'API DELIVERY DIRECTEMENT
// À exécuter dans la console du navigateur sur la page delivery

async function testDeliveryAPI() {
  try {
    console.log('🧪 Test de l\'API delivery...');
    
    // Récupérer la session Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Erreur session:', error);
      return;
    }
    
    if (!session?.access_token) {
      console.error('❌ Pas de token d\'authentification');
      return;
    }
    
    console.log('✅ Token trouvé:', !!session.access_token);
    
    // Tester l'API available-orders
    const response = await fetch('/api/delivery/available-orders', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Réponse API:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('📦 Données reçues:', data);
    
    if (Array.isArray(data)) {
      console.log(`✅ ${data.length} commandes disponibles`);
      data.forEach((order, index) => {
        console.log(`Commande ${index + 1}:`, {
          id: order.id,
          statut: order.statut,
          total: order.total,
          restaurant: order.restaurant?.nom
        });
      });
    } else {
      console.log('❌ Les données ne sont pas un tableau:', data);
    }
    
  } catch (error) {
    console.error('❌ Erreur test:', error);
  }
}

// Exécuter le test
testDeliveryAPI();

// Script pour tester l'API du restaurant
// À copier-coller dans la console du navigateur

async function testRestaurantAPI() {
  try {
    console.log('🧪 Test de l\'API du restaurant...');
    
    // ID du restaurant de la commande #999
    const restaurantId = '7f1e0b5f-5552-445d-a582-306515030c8d';
    
    // Appeler l'API des commandes du restaurant
    const response = await fetch(`/api/restaurants/${restaurantId}/orders`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Réponse API restaurant:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('📊 Données reçues:', data);
    
    if (response.ok) {
      console.log(`✅ ${data.orders?.length || 0} commande(s) trouvée(s)`);
      if (data.orders && data.orders.length > 0) {
        console.log('🍽️ Commandes:', data.orders);
        // Chercher la commande #999
        const order999 = data.orders.find(o => o.id === 999);
        if (order999) {
          console.log('🎯 Commande #999 trouvée:', order999);
        } else {
          console.log('❌ Commande #999 non trouvée dans les résultats');
        }
      }
    } else {
      console.error('❌ Erreur API restaurant:', data);
    }
    
  } catch (error) {
    console.error('❌ Erreur test API restaurant:', error);
  }
}

// Exécuter le test
testRestaurantAPI();

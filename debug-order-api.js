// Script de debug pour tester l'API orders
// À exécuter dans la console du navigateur

async function testOrderAPI() {
  const orderId = 'bf46a061-38b0-45e8-a3bb-6764bbbcb327'; // Remplacez par l'ID de votre commande
  
  console.log('🔍 Test de l\'API orders...');
  console.log('ID de commande:', orderId);
  
  try {
    const response = await fetch(`/api/orders/${orderId}`);
    console.log('Status de la réponse:', response.status);
    console.log('Headers:', response.headers);
    
    const data = await response.text();
    console.log('Données brutes:', data);
    
    if (response.ok) {
      const order = JSON.parse(data);
      console.log('✅ Commande trouvée:', order);
    } else {
      console.log('❌ Erreur:', data);
    }
  } catch (error) {
    console.error('❌ Erreur de fetch:', error);
  }
}

// Exécuter le test
testOrderAPI();

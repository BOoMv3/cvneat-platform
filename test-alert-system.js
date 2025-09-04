// Script pour tester le système d'alertes
// À exécuter dans la console du navigateur sur http://localhost:3000/admin/dashboard

console.log('🧪 Test du système d\'alertes...');

const createTestOrder = async () => {
  try {
    // Données de la commande de test
    const orderData = {
      restaurant_id: '4572cee6-1fc6-4f32-b007-57c46871ec70', // ID du Restaurant Test
      customer_name: 'Client Test Alerte ' + Date.now(),
      customer_phone: '0612345678',
      delivery_address: '15 Rue de la Nouvelle Commande',
      delivery_city: 'Paris',
      delivery_postal_code: '75001',
      delivery_instructions: 'Sonner fort, 3ème étage',
      total_amount: 25.50,
      delivery_fee: 3.00,
      status: 'pending',
      items: [
        {
          name: 'Pizza Test Alerte',
          price: 15.50,
          quantity: 1,
          category: 'Pizza'
        },
        {
          name: 'Boisson Test',
          price: 7.00,
          quantity: 1,
          category: 'Boisson'
        }
      ]
    };

    console.log('📦 Création de la commande de test...', orderData);

    // Créer la commande via l'API
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Commande créée avec succès !', result);
      console.log('🔔 Cette commande devrait maintenant déclencher les alertes sur le dashboard livreur');
      
      // Ouvrir le dashboard livreur dans un nouvel onglet
      setTimeout(() => {
        window.open('http://localhost:3000/delivery/dashboard', '_blank');
      }, 2000);
    } else {
      const error = await response.json();
      console.error('❌ Erreur lors de la création:', error);
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

// Exécuter la création
createTestOrder();

console.log('📋 Instructions:');
console.log('1. Ce script va créer une nouvelle commande');
console.log('2. Le dashboard livreur s\'ouvrira automatiquement dans un nouvel onglet');
console.log('3. Les alertes devraient apparaître !');
// Script pour créer une commande de test via l'API
// À exécuter dans la console du navigateur sur http://localhost:3001/admin

console.log('🍕 Création d\'une commande de test...');

const createTestOrder = async () => {
  try {
    // Données de la commande de test
    const orderData = {
      restaurant_id: '4572cee6-1fc6-4f32-b007-57c46871ec70', // ID du Restaurant Test
      customer_name: 'Client Test Alerte',
      customer_phone: '0612345678',
      delivery_address: '15 Rue de la Nouvelle Commande',
      delivery_city: 'Paris',
      delivery_postal_code: '75001',
      delivery_instructions: 'Sonner fort, 3ème étage',
      total_amount: 32.50,
      delivery_fee: 3.00,
      status: 'pending',
      items: [
        {
          name: 'Pizza Quatre Fromages',
          price: 18.50,
          quantity: 1,
          category: 'Pizza'
        },
        {
          name: 'Salade César',
          price: 8.00,
          quantity: 1,
          category: 'Salade'
        },
        {
          name: 'Coca Cola',
          price: 3.00,
          quantity: 2,
          category: 'Boisson'
        }
      ]
    };

    console.log('📦 Données de la commande:', orderData);

    // Créer la commande via l'API
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || 'test-token'}`
      },
      body: JSON.stringify(orderData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Commande créée avec succès !', result);
      console.log('🔔 Cette commande devrait maintenant déclencher les alertes sur le dashboard livreur');
      
      // Recharger la page pour voir la nouvelle commande
      setTimeout(() => {
        window.location.reload();
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
console.log('1. Exécutez ce script dans la console du navigateur');
console.log('2. Allez sur http://localhost:3001/delivery/dashboard');
console.log('3. Les alertes devraient apparaître automatiquement !');

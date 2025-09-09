// Diagnostic approfondi de l'API des alertes
// À exécuter dans la console du navigateur sur le dashboard livreur

console.log('🔍 Diagnostic approfondi de l\'API des alertes...');

// Fonction pour tester l'API avec plus de détails
async function debugAPI() {
  try {
    const token = localStorage.getItem('token');
    console.log('🔑 Token:', token ? 'Trouvé' : 'Non trouvé');
    
    if (!token) {
      console.error('❌ Aucun token trouvé');
      return;
    }
    
    // Test 1: Appel de l'API des alertes
    console.log('📡 Test 1: Appel de l\'API des alertes...');
    const response = await fetch('/api/delivery/preparation-alerts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Statut:', response.status);
    const data = await response.json();
    console.log('📊 Données:', data);
    
    // Test 2: Vérifier les commandes disponibles
    console.log('📡 Test 2: Vérifier les commandes disponibles...');
    const ordersResponse = await fetch('/api/delivery/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Statut commandes:', ordersResponse.status);
    const ordersData = await ordersResponse.json();
    console.log('📊 Commandes disponibles:', ordersData);
    
    // Test 3: Vérifier les commandes en préparation
    console.log('📡 Test 3: Vérifier les commandes en préparation...');
    const preparingResponse = await fetch('/api/delivery/orders?status=preparing', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Statut préparation:', preparingResponse.status);
    const preparingData = await preparingResponse.json();
    console.log('📊 Commandes en préparation:', preparingData);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter le diagnostic
debugAPI();

// Script pour tester l'acceptation d'une commande
// À exécuter dans la console du navigateur sur la page du dashboard livreur

async function testAcceptOrder() {
  try {
    // Récupérer le token depuis les cookies
    const cookies = document.cookie.split(';');
    let token = null;
    
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'sb-access-token' || name === 'supabase-auth-token') {
        token = value;
        break;
      }
    }
    
    if (!token) {
      console.error('❌ Pas de token trouvé dans les cookies');
      return;
    }
    
    console.log('✅ Token trouvé');
    
    // 1. D'abord, récupérer les commandes disponibles
    console.log('🔍 Récupération des commandes disponibles...');
    const availableResponse = await fetch('/api/delivery/available-orders', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Réponse commandes disponibles:');
    console.log('- Status:', availableResponse.status);
    
    const availableData = await availableResponse.json();
    console.log('- Données:', availableData);
    
    if (availableResponse.ok && availableData.orders && availableData.orders.length > 0) {
      const orderToAccept = availableData.orders[0];
      console.log('🎯 Commande à accepter:', orderToAccept.id);
      
      // 2. Accepter la commande
      console.log('📤 Acceptation de la commande...');
      const acceptResponse = await fetch(`/api/delivery/accept-order/${orderToAccept.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Réponse acceptation:');
      console.log('- Status:', acceptResponse.status);
      
      const acceptData = await acceptResponse.json();
      console.log('- Données:', acceptData);
      
      if (acceptResponse.ok) {
        console.log('✅ Commande acceptée avec succès !');
        
        // 3. Vérifier la commande actuelle
        console.log('🔍 Vérification commande actuelle...');
        setTimeout(async () => {
          const currentResponse = await fetch('/api/delivery/current-order', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📡 Réponse commande actuelle:');
          console.log('- Status:', currentResponse.status);
          
          const currentData = await currentResponse.json();
          console.log('- Données:', currentData);
          
          if (currentResponse.ok && currentData.hasOrder) {
            console.log('🎉 SUCCÈS ! Commande actuelle trouvée:', currentData.order.id);
          } else {
            console.log('❌ ÉCHEC ! Aucune commande actuelle trouvée');
          }
        }, 2000);
        
      } else {
        console.error('❌ Erreur acceptation:', acceptData);
      }
      
    } else {
      console.log('ℹ️ Aucune commande disponible à accepter');
    }
    
  } catch (error) {
    console.error('❌ Erreur test:', error);
  }
}

// Exécuter le test
testAcceptOrder();

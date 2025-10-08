// Script pour tester l'API current-order
// À exécuter dans la console du navigateur sur la page du dashboard livreur

async function testCurrentOrderAPI() {
  try {
    // Récupérer la session Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ Pas de session');
      return;
    }
    
    console.log('✅ Session trouvée:', session.user.email);
    
    // Tester l'API current-order
    const response = await fetch('/api/delivery/current-order', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Réponse API current-order:');
    console.log('- Status:', response.status);
    console.log('- Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('- Données:', data);
    
    if (response.ok) {
      if (data.hasOrder) {
        console.log('✅ Commande actuelle trouvée:', data.order);
      } else {
        console.log('ℹ️ Aucune commande actuelle');
      }
    } else {
      console.error('❌ Erreur API:', data);
    }
    
  } catch (error) {
    console.error('❌ Erreur test:', error);
  }
}

// Exécuter le test
testCurrentOrderAPI();

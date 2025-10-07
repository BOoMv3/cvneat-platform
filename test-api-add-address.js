// SCRIPT DE TEST DE L'API D'AJOUT D'ADRESSE
// À exécuter dans la console du navigateur

console.log('=== TEST API ADD ADDRESS ===');

async function testAddAddress() {
  try {
    // 1. Récupérer la session Supabase
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔍 Session:', session ? 'Présente' : 'Absente');
    
    if (!session) {
      console.error('❌ Aucune session trouvée');
      return;
    }
    
    const token = session.access_token;
    console.log('🔍 Token:', token ? 'Présent' : 'Absent');
    console.log('🔍 User ID:', session.user.id);
    
    // 2. Tester l'API POST /api/users/addresses
    console.log('🔍 Test de l\'API /api/users/addresses...');
    
    const response = await fetch('/api/users/addresses', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Adresse Test API',
        address: '456 Rue de Test API',
        city: 'Montpellier',
        postal_code: '34000',
        is_default: false
      })
    });
    
    console.log('🔍 Statut de la réponse:', response.status);
    console.log('🔍 Headers de la réponse:', [...response.headers.entries()]);
    
    const data = await response.json();
    console.log('🔍 Données reçues:', data);
    
    if (response.ok) {
      console.log('✅ API fonctionne ! Adresse créée:', data.address);
    } else {
      console.error('❌ Erreur API:', data);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
console.log('🚀 Démarrage du test...');
testAddAddress();

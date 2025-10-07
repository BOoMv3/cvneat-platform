// SCRIPT DE TEST DE L'API /api/partner/orders
// À exécuter dans la console du navigateur sur localhost:3000/partner

console.log('=== TEST API PARTNER ORDERS ===');

// 1. Récupérer la session Supabase
async function testAPI() {
  try {
    // Récupérer la session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔍 Session:', session ? 'Présente' : 'Absente');
    
    if (!session) {
      console.error('❌ Aucune session trouvée');
      return;
    }
    
    const token = session.access_token;
    console.log('🔍 Token:', token ? 'Présent' : 'Absent');
    console.log('🔍 Token (premiers caractères):', token ? token.substring(0, 20) + '...' : 'Aucun');
    
    // 2. Tester l'API /api/partner/orders
    console.log('🔍 Test de l\'API /api/partner/orders...');
    
    const response = await fetch('/api/partner/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('🔍 Statut de la réponse:', response.status);
    console.log('🔍 Headers de la réponse:', [...response.headers.entries()]);
    
    const data = await response.json();
    console.log('🔍 Données reçues:', data);
    
    if (response.ok) {
      console.log('✅ API fonctionne ! Nombre de commandes:', data.length);
      data.forEach((order, index) => {
        console.log(`📦 Commande ${index + 1}:`, {
          id: order.id,
          statut: order.statut,
          total: order.total,
          created_at: order.created_at
        });
      });
    } else {
      console.error('❌ Erreur API:', data);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// 3. Tester aussi l'API dashboard
async function testDashboardAPI() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const token = session.access_token;
    
    console.log('🔍 Test de l\'API /api/partner/dashboard...');
    
    const response = await fetch('/api/partner/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('🔍 Dashboard - Statut:', response.status);
    const data = await response.json();
    console.log('🔍 Dashboard - Données:', data);
    
  } catch (error) {
    console.error('❌ Erreur dashboard:', error);
  }
}

// Exécuter les tests
console.log('🚀 Démarrage des tests...');
testAPI();
testDashboardAPI();

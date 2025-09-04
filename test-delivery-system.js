// Script de test pour le système de livraison
// Copiez-collez dans la console du navigateur

async function testDeliverySystem() {
  console.log('🔍 Test complet du système de livraison...');
  
  try {
    // 1. Vérifier l'authentification
    console.log('1. Vérification de l\'authentification...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ Pas d\'utilisateur connecté');
      return;
    }
    
    console.log('✅ Utilisateur connecté:', user.email);
    
    // 2. Vérifier le rôle dans la base
    console.log('2. Vérification du rôle...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();
    
    if (userError) {
      console.error('❌ Erreur rôle:', userError);
      return;
    }
    
    console.log('✅ Rôle:', userData.role);
    
    // 3. Tester l'API avec authentification
    console.log('3. Test de l\'API...');
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    const response = await fetch('/api/delivery/available-orders', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Statut API:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Commandes disponibles:', data.length);
      data.forEach(order => console.log(`- ${order.customer_name} (${order.status})`));
    } else {
      const error = await response.json();
      console.error('❌ Erreur API:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testDeliverySystem();
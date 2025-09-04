// Script de test pour vérifier l'authentification livreur
// À exécuter dans la console du navigateur sur localhost:3000

async function testDeliveryAuth() {
  console.log('🧪 Test d\'authentification livreur...');
  
  try {
    // Test 1: Vérifier la connexion Supabase
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Ymdydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjQyNDMsImV4cCI6MjA3MTk0MDI0M30.FqDYhevVvPYe-1t52OcidgP6jG-ynJVOFkyGTPHk84A';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test 2: Vérifier les utilisateurs avec rôle delivery
    console.log('📋 Vérification des utilisateurs livreurs...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, nom, prenom')
      .eq('role', 'delivery');
    
    if (usersError) {
      console.error('❌ Erreur récupération utilisateurs:', usersError);
      return;
    }
    
    console.log('👥 Utilisateurs avec rôle delivery:', users);
    
    if (users.length === 0) {
      console.log('⚠️ Aucun utilisateur avec rôle delivery trouvé');
      console.log('💡 Exécutez le script fix-delivery-user-role.sql dans Supabase');
      return;
    }
    
    // Test 3: Vérifier les commandes disponibles
    console.log('📦 Vérification des commandes disponibles...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'ready')
      .is('delivery_id', null);
    
    if (ordersError) {
      console.error('❌ Erreur récupération commandes:', ordersError);
      return;
    }
    
    console.log('📋 Commandes disponibles:', orders);
    
    // Test 4: Résumé
    console.log('✅ Résumé des tests:');
    console.log(`- ${users.length} livreur(s) trouvé(s)`);
    console.log(`- ${orders.length} commande(s) disponible(s)`);
    
    if (users.length > 0 && orders.length > 0) {
      console.log('🎉 Système prêt pour les tests !');
      console.log('🔑 Connectez-vous avec:', users[0].email);
    } else {
      console.log('⚠️ Problèmes détectés, vérifiez les données');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testDeliveryAuth();

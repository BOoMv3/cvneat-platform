// Test rapide du système de livraison
// À exécuter dans la console du navigateur sur localhost:3000

async function quickTestDelivery() {
  console.log('🚚 Test rapide du système de livraison...');
  
  try {
    // Test 1: Vérifier la connexion Supabase
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Ymdydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjQyNDMsImV4cCI6MjA3MTk0MDI0M30.FqDYhevVvPYe-1t52OcidgP6jG-ynJVOFkyGTPHk84A';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test 2: Vérifier l'utilisateur livreur
    console.log('👤 Vérification de l\'utilisateur livreur...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, nom, prenom')
      .eq('email', 'livreur@cvneat.com')
      .single();
    
    if (userError) {
      console.error('❌ Erreur récupération utilisateur:', userError);
      console.log('💡 Exécutez le script fix-livreur-user-table.sql dans Supabase');
      return;
    }
    
    console.log('✅ Utilisateur livreur trouvé:', user);
    
    if (user.role !== 'delivery') {
      console.error('❌ Rôle incorrect:', user.role, '(attendu: delivery)');
      return;
    }
    
    // Test 3: Vérifier les commandes disponibles
    console.log('📦 Vérification des commandes disponibles...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, delivery_id, customer_name, total_amount')
      .eq('status', 'ready')
      .is('delivery_id', null);
    
    if (ordersError) {
      console.error('❌ Erreur récupération commandes:', ordersError);
      return;
    }
    
    console.log('📋 Commandes disponibles:', orders);
    
    // Test 4: Résumé
    console.log('📊 RÉSUMÉ:');
    console.log(`✅ Utilisateur livreur: ${user.email} (rôle: ${user.role})`);
    console.log(`📦 Commandes disponibles: ${orders.length}`);
    
    if (orders.length > 0) {
      console.log('🎉 SYSTÈME PRÊT !');
      console.log('🔑 Connectez-vous avec: livreur@cvneat.com');
      console.log('📱 Allez sur: http://localhost:3000/delivery');
    } else {
      console.log('⚠️ Aucune commande disponible - Le script SQL va en créer une');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
quickTestDelivery();

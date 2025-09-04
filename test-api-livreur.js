// Test de l'API livreur
// À exécuter dans la console du navigateur sur localhost:3000

async function testApiLivreur() {
  console.log('🔍 TEST API LIVREUR');
  console.log('==================');
  
  try {
    // Test 1: Vérifier la connexion Supabase
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Ymdydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjQyNDMsImV4cCI6MjA3MTk0MDI0M30.FqDYhevVvPYe-1t52OcidgP6jG-ynJVOFkyGTPHk84A';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test 2: Vérifier l'authentification
    console.log('🔐 Vérification de l\'authentification...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Erreur authentification:', authError);
      console.log('💡 Vous devez être connecté pour tester l\'API');
      return;
    }
    
    if (!user) {
      console.log('⚠️ Aucun utilisateur connecté');
      console.log('💡 Connectez-vous d\'abord sur http://localhost:3000/login');
      return;
    }
    
    console.log('✅ Utilisateur connecté:', user.email);
    
    // Test 3: Vérifier le rôle
    console.log('👤 Vérification du rôle...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, nom, prenom')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.error('❌ Erreur récupération utilisateur:', userError);
      return;
    }
    
    console.log('✅ Rôle utilisateur:', userData.role);
    
    if (userData.role !== 'delivery') {
      console.error('❌ Rôle incorrect:', userData.role, '(attendu: delivery)');
      console.log('💡 Exécutez le script fix-tout-complet.sql dans Supabase');
      return;
    }
    
    // Test 4: Vérifier les commandes directement
    console.log('📦 Vérification des commandes...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone, latitude, longitude)
      `)
      .in('status', ['pending', 'ready'])
      .is('delivery_id', null)
      .order('created_at', { ascending: true });
    
    if (ordersError) {
      console.error('❌ Erreur récupération commandes:', ordersError);
      return;
    }
    
    console.log('📋 Commandes disponibles:', orders.length);
    orders.forEach(order => {
      console.log(`  - Commande ${order.id}: ${order.customer_name} (${order.status}) - ${order.total_amount}€`);
    });
    
    // Test 5: Test de l'API
    console.log('🌐 Test de l\'API...');
    try {
      const response = await fetch('/api/delivery/available-orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Statut API:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API fonctionne - Commandes reçues:', data.length);
        data.forEach(order => {
          console.log(`  - API: Commande ${order.id}: ${order.customer_name} (${order.status})`);
        });
      } else {
        const error = await response.json();
        console.error('❌ Erreur API:', error);
      }
    } catch (apiError) {
      console.error('❌ Erreur API:', apiError.message);
    }
    
    // Test 6: Résumé
    console.log('📊 RÉSUMÉ:');
    console.log(`✅ Utilisateur: ${user.email}`);
    console.log(`✅ Rôle: ${userData.role}`);
    console.log(`📦 Commandes directes: ${orders.length}`);
    
    if (orders.length === 0) {
      console.log('⚠️ Aucune commande disponible');
      console.log('💡 Exécutez le script debug-commandes-livreur.sql dans Supabase');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testApiLivreur();

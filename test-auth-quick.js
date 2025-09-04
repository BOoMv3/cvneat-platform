// Test rapide d'authentification
// À exécuter dans la console du navigateur sur localhost:3000

async function testAuthQuick() {
  console.log('🔐 Test rapide d\'authentification...');
  
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
      console.log('💡 Exécutez le script fix-access-refused.sql dans Supabase');
      return;
    }
    
    console.log('✅ Utilisateur trouvé:', user);
    
    if (user.role !== 'delivery') {
      console.error('❌ Rôle incorrect:', user.role, '(attendu: delivery)');
      console.log('💡 Exécutez le script fix-access-refused.sql dans Supabase');
      return;
    }
    
    console.log('✅ Rôle correct: delivery');
    
    // Test 3: Test de l'API
    console.log('🌐 Test de l\'API...');
    try {
      const response = await fetch('/api/delivery/available-orders', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      console.log('📡 Statut API:', response.status);
      
      if (response.status === 401) {
        console.log('⚠️ 401 - Token manquant (normal pour ce test)');
      } else if (response.status === 403) {
        console.log('❌ 403 - Rôle incorrect');
      } else {
        console.log('✅ API accessible');
      }
    } catch (apiError) {
      console.log('⚠️ Erreur API (normal si pas connecté):', apiError.message);
    }
    
    // Test 4: Résumé
    console.log('📊 RÉSUMÉ:');
    console.log(`✅ Utilisateur: ${user.email}`);
    console.log(`✅ Rôle: ${user.role}`);
    console.log('🎯 Prochaines étapes:');
    console.log('1. Connectez-vous sur http://localhost:3000/delivery');
    console.log('2. Utilisez: livreur@cvneat.com / password123');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testAuthQuick();

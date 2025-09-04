// Script de test complet du système
// À exécuter dans la console du navigateur sur localhost:3000

async function testCompleteSystem() {
  console.log('🚀 Test complet du système de livraison...');
  
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
      console.log('💡 Exécutez le script fix-livreur-role-final.sql dans Supabase');
      return;
    }
    
    console.log('✅ Utilisateur trouvé:', user);
    
    if (user.role !== 'delivery') {
      console.error('❌ Rôle incorrect:', user.role, '(attendu: delivery)');
      console.log('💡 Exécutez le script fix-livreur-role-final.sql dans Supabase');
      return;
    }
    
    console.log('✅ Rôle correct: delivery');
    
    // Test 3: Vérifier les commandes
    console.log('📦 Vérification des commandes...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('❌ Erreur récupération commandes:', ordersError);
      return;
    }
    
    console.log('📋 Commandes trouvées:', orders.length);
    
    // Test 4: Vérifier les restaurants
    console.log('🏪 Vérification des restaurants...');
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, nom, status');
    
    if (restaurantsError) {
      console.error('❌ Erreur récupération restaurants:', restaurantsError);
      return;
    }
    
    console.log('🏪 Restaurants trouvés:', restaurants.length);
    
    // Test 5: Vérifier les menus
    console.log('🍕 Vérification des menus...');
    const { data: menus, error: menusError } = await supabase
      .from('menus')
      .select('id, nom, prix, disponible, restaurant_id')
      .eq('disponible', true);
    
    if (menusError) {
      console.error('❌ Erreur récupération menus:', menusError);
      return;
    }
    
    console.log('🍕 Menus disponibles:', menus.length);
    
    // Test 6: Résumé complet
    console.log('📊 RÉSUMÉ COMPLET:');
    console.log(`✅ Utilisateur livreur: ${user.email} (rôle: ${user.role})`);
    console.log(`📦 Total commandes: ${orders.length}`);
    console.log(`🏪 Restaurants: ${restaurants.length}`);
    console.log(`🍕 Menus disponibles: ${menus.length}`);
    
    // Test 7: Vérifier les URLs
    console.log('🌐 URLs de test:');
    console.log('📱 Tableau de bord livreur: http://localhost:3000/delivery');
    console.log('🏪 Tableau de bord restaurant: http://localhost:3000/restaurant-dashboard');
    console.log('🔑 Connexion livreur: livreur@cvneat.com / password123');
    
    // Test 8: Statut final
    if (user.role === 'delivery' && orders.length > 0 && restaurants.length > 0 && menus.length > 0) {
      console.log('🎉 SYSTÈME COMPLET ET FONCTIONNEL !');
      console.log('🚀 Prêt pour les tests en temps réel !');
    } else {
      console.log('⚠️ SYSTÈME INCOMPLET - Vérifiez les données');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testCompleteSystem();

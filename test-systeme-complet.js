// Test complet du système
// À exécuter dans la console du navigateur sur localhost:3000

async function testSystemeComplet() {
  console.log('🚀 TEST COMPLET DU SYSTÈME DE LIVRAISON');
  console.log('=====================================');
  
  try {
    // Test 1: Vérifier la connexion Supabase
    const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
    
    const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Ymdydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjQyNDMsImV4cCI6MjA3MTk0MDI0M30.FqDYhevVvPYe-1t52OcidgP6jG-ynJVOFkyGTPHk84A';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test 2: Vérifier les livreurs
    console.log('👤 Vérification des livreurs...');
    const { data: livreurs, error: livreursError } = await supabase
      .from('users')
      .select('id, email, role, nom, prenom, password')
      .eq('role', 'delivery');
    
    if (livreursError) {
      console.error('❌ Erreur récupération livreurs:', livreursError);
      return;
    }
    
    console.log('✅ Livreurs trouvés:', livreurs.length);
    livreurs.forEach(livreur => {
      console.log(`  - ${livreur.email} (${livreur.role}) - Mot de passe: ${livreur.password}`);
    });
    
    // Test 3: Vérifier les commandes
    console.log('📦 Vérification des commandes...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_name, status, total_amount, created_at')
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('❌ Erreur récupération commandes:', ordersError);
      return;
    }
    
    console.log('📋 Commandes trouvées:', orders.length);
    orders.forEach(order => {
      console.log(`  - Commande ${order.id}: ${order.customer_name} (${order.status}) - ${order.total_amount}€`);
    });
    
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
    restaurants.forEach(restaurant => {
      console.log(`  - ${restaurant.nom} (${restaurant.status})`);
    });
    
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
    menus.forEach(menu => {
      console.log(`  - ${menu.nom} (${menu.prix}€)`);
    });
    
    // Test 6: Résumé complet
    console.log('📊 RÉSUMÉ COMPLET:');
    console.log(`✅ Livreurs: ${livreurs.length}`);
    console.log(`📦 Total commandes: ${orders.length}`);
    console.log(`🏪 Restaurants: ${restaurants.length}`);
    console.log(`🍕 Menus disponibles: ${menus.length}`);
    
    // Test 7: Vérifier les URLs
    console.log('🌐 URLs de test:');
    console.log('📱 Tableau de bord livreur: http://localhost:3000/delivery');
    console.log('🏪 Tableau de bord restaurant: http://localhost:3000/restaurant-dashboard');
    console.log('🔑 Page de connexion: http://localhost:3000/login');
    
    // Test 8: Comptes de test
    console.log('🔑 Comptes de test:');
    console.log('📱 Livreur1: livreur1@cvneat.com / livreur123');
    console.log('📱 Livreur: livreur@cvneat.com / livreur123');
    console.log('🏪 Restaurant: owner@labonnepate.fr / password123');
    
    // Test 9: Statut final
    if (livreurs.length > 0 && orders.length > 0 && restaurants.length > 0 && menus.length > 0) {
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
testSystemeComplet();

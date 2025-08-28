const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Ymdydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjQyNDMsImV4cCI6MjA3MTk0MDI0M30.FqDYhevVvPYe-1t52OcidgP6jG-ynJVOFkyGTPHk84A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRestaurantStatus() {
  console.log('🔍 Vérification du statut des restaurants\n');

  try {
    // Récupérer tous les restaurants avec leur statut
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, nom, status');

    if (error) {
      console.log('❌ Erreur lors de la récupération:', error);
      return;
    }

    console.log('📋 Restaurants trouvés:');
    restaurants.forEach(restaurant => {
      console.log(`  - ${restaurant.nom}: status = "${restaurant.status}"`);
    });

    // Vérifier spécifiquement le Restaurant Test
    const { data: restaurantTest, error: testError } = await supabase
      .from('restaurants')
      .select('id, nom, status')
      .eq('nom', 'Restaurant Test')
      .single();

    if (testError) {
      console.log('\n❌ Restaurant Test non trouvé:', testError);
    } else {
      console.log('\n🍕 Restaurant Test:');
      console.log(`  - Nom: ${restaurantTest.nom}`);
      console.log(`  - Status: "${restaurantTest.status}"`);
      console.log(`  - ID: ${restaurantTest.id}`);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkRestaurantStatus(); 
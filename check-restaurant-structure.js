const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Ymdydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjQyNDMsImV4cCI6MjA3MTk0MDI0M30.FqDYhevVvPYe-1t52OcidgP6jG-ynJVOFkyGTPHk84A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRestaurantStructure() {
  console.log('🔍 Vérification de la structure de la table restaurants\n');

  try {
    // 1. Vérifier la structure de la table
    const { data: structure, error: structureError } = await supabase
      .from('restaurants')
      .select('*')
      .limit(1);

    if (structureError) {
      console.log('❌ Erreur lors de la récupération de la structure:', structureError);
      return;
    }

    if (structure && structure.length > 0) {
      const sampleRestaurant = structure[0];
      console.log('✅ Structure de la table restaurants:');
      console.log('Colonnes disponibles:', Object.keys(sampleRestaurant));
      console.log('\n📋 Exemple de données:');
      console.log(JSON.stringify(sampleRestaurant, null, 2));
    }

    // 2. Vérifier le restaurant "Restaurant Test"
    const { data: restaurantTest, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('nom', 'Restaurant Test')
      .single();

    if (restaurantError) {
      console.log('\n❌ Erreur lors de la récupération du Restaurant Test:', restaurantError);
    } else {
      console.log('\n🍕 Restaurant Test trouvé:');
      console.log('ID:', restaurantTest.id);
      console.log('Nom:', restaurantTest.nom);
      console.log('Status:', restaurantTest.status);
      console.log('Images disponibles:');
      
      // Vérifier les colonnes d'images
      const imageColumns = ['image', 'logo', 'banner_image', 'profile_image', 'banner', 'profile'];
      imageColumns.forEach(col => {
        if (restaurantTest[col]) {
          console.log(`  ✅ ${col}: ${restaurantTest[col]}`);
        } else {
          console.log(`  ❌ ${col}: Non définie`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

checkRestaurantStructure(); 
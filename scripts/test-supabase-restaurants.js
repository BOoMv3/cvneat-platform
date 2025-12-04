// Script pour tester l'accès à Supabase depuis le client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Ymdydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNjQyNDMsImV4cCI6MjA3MTk0MDI0M30.FqDYhevVvPYe-1t52OcidgP6jG-ynJVOFkyGTPHk84A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRestaurants() {
  console.log('🔍 Test de récupération des restaurants depuis Supabase...');
  console.log('📡 URL:', supabaseUrl);
  console.log('🔑 Clé anon disponible:', !!supabaseAnonKey);
  
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*, frais_livraison')
      .limit(5);
    
    if (error) {
      console.error('❌ Erreur Supabase:');
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Détails:', error.details);
      console.error('   Hint:', error.hint);
      
      if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
        console.error('\n⚠️  PROBLÈME DE PERMISSIONS RLS DÉTECTÉ!');
        console.error('   La table restaurants nécessite une politique RLS pour la lecture publique.');
        console.error('   Exécutez ce SQL dans Supabase SQL Editor:');
        console.error(`
-- Permettre la lecture publique des restaurants
CREATE POLICY "Public restaurants are viewable by everyone" ON restaurants
FOR SELECT
TO anon, authenticated
USING (true);
        `);
      }
      return;
    }
    
    console.log('✅ Succès!');
    console.log(`📊 Nombre de restaurants récupérés: ${data?.length || 0}`);
    
    if (data && data.length > 0) {
      console.log('\n📋 Premier restaurant:');
      console.log('   ID:', data[0].id);
      console.log('   Nom:', data[0].nom);
      console.log('   Actif:', data[0].is_active);
    } else {
      console.log('⚠️  Aucun restaurant trouvé dans la base de données');
    }
    
  } catch (err) {
    console.error('❌ Erreur inattendue:', err);
  }
}

testRestaurants();


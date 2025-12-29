#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fermerBonnePate() {
  try {
    console.log('🔍 Recherche de "La Bonne Pâte"...');
    
    // Chercher avec plusieurs variantes
    const { data: restaurants, error: searchError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .or('nom.ilike.%bonne pate%,nom.ilike.%bonne pâte%,nom.ilike.%la bonne%');
    
    if (searchError) {
      console.error('❌ Erreur recherche:', searchError);
      process.exit(1);
    }
    
    if (!restaurants || restaurants.length === 0) {
      console.error('❌ Restaurant "La Bonne Pâte" non trouvé');
      process.exit(1);
    }
    
    const restaurant = restaurants[0];
    console.log('\n📋 Restaurant trouvé:');
    console.log('   Nom:', restaurant.nom);
    console.log('   ID:', restaurant.id);
    console.log('   ferme_manuellement ACTUEL:', restaurant.ferme_manuellement, '(type:', typeof restaurant.ferme_manuellement, ')');
    
    if (restaurant.ferme_manuellement === true) {
      console.log('\n✅ Le restaurant est déjà fermé manuellement.');
      process.exit(0);
    }
    
    console.log('\n🔒 Fermeture manuelle du restaurant...');
    
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({
        ferme_manuellement: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurant.id)
      .select('id, nom, ferme_manuellement')
      .single();
    
    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError);
      process.exit(1);
    }
    
    console.log('\n✅ Restaurant fermé manuellement avec succès !');
    console.log('   Nom:', updated.nom);
    console.log('   ferme_manuellement:', updated.ferme_manuellement);
    console.log('   Le restaurant apparaîtra fermé immédiatement.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

fermerBonnePate();


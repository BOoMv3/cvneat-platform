#!/usr/bin/env node

/**
 * Script pour ouvrir le restaurant Smaash Burger
 * Usage: node scripts/ouvrir-smaash-burger-direct.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ouvrirSmaashBurger() {
  try {
    console.log('🔍 Recherche du restaurant Smaash Burger...\n');
    
    // Chercher le restaurant
    const { data: restaurants, error: searchError } = await supabase
      .from('restaurants')
      .select('id, nom, email, ferme_manuellement')
      .or('nom.ilike.%smaash%burger%,nom.ilike.%smash%burger%');

    if (searchError) {
      console.error('❌ Erreur lors de la recherche:', searchError.message);
      process.exit(1);
    }

    if (!restaurants || restaurants.length === 0) {
      console.error('❌ Aucun restaurant "Smaash Burger" trouvé');
      console.error('   Vérifiez le nom exact du restaurant dans la base de données');
      process.exit(1);
    }

    if (restaurants.length > 1) {
      console.log('⚠️  Plusieurs restaurants trouvés:');
      restaurants.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.nom} (ID: ${r.id}, fermé manuellement: ${r.ferme_manuellement})`);
      });
      console.log('\n   Mise à jour de tous les restaurants trouvés...\n');
    }

    // Ouvrir chaque restaurant trouvé
    for (const restaurant of restaurants) {
      console.log(`📝 Ouverture du restaurant: ${restaurant.nom} (ID: ${restaurant.id})`);
      
      const { data: updatedRestaurant, error: updateError } = await supabase
        .from('restaurants')
        .update({
          ferme_manuellement: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurant.id)
        .select('id, nom, ferme_manuellement')
        .single();

      if (updateError) {
        console.error(`❌ Erreur lors de l'ouverture de ${restaurant.nom}:`, updateError.message);
        continue;
      }

      console.log(`✅ Restaurant ouvert avec succès !`);
      console.log(`   Nom: ${updatedRestaurant.nom}`);
      console.log(`   Fermé manuellement: ${updatedRestaurant.ferme_manuellement}`);
      console.log('');
    }

    console.log('✅ Opération terminée !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

ouvrirSmaashBurger();


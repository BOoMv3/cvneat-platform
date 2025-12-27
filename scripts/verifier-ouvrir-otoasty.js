#!/usr/bin/env node

/**
 * Script pour vérifier et ouvrir le restaurant "O'Toasty"
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/verifier-ouvrir-otoasty.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function verifierOuvrirOToasty() {
  try {
    console.log('🔍 Recherche du restaurant "O\'Toasty"...\n');

    // Rechercher avec plusieurs variantes du nom
    const { data: restaurants, error: searchError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .or('nom.ilike.%otoasty%,nom.ilike.%toasty%,nom.ilike.%o%toasty%');

    if (searchError) {
      console.error('❌ Erreur lors de la recherche:', searchError);
      process.exit(1);
    }

    if (!restaurants || restaurants.length === 0) {
      console.error('❌ Restaurant "O\'Toasty" non trouvé.');
      process.exit(1);
    }

    const restaurant = restaurants[0];
    console.log(`📋 Restaurant trouvé: ${restaurant.nom}`);
    console.log(`   ID: ${restaurant.id}`);
    console.log(`   ferme_manuellement: ${restaurant.ferme_manuellement} (type: ${typeof restaurant.ferme_manuellement})\n`);

    if (restaurant.ferme_manuellement === true) {
      console.log('📝 Ouverture du restaurant...');
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('restaurants')
        .update({
          ferme_manuellement: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurant.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erreur lors de l\'ouverture:', updateError);
        process.exit(1);
      }

      console.log('✅ Restaurant ouvert avec succès !');
      console.log('   Nom:', updated.nom);
      console.log('   Fermé manuellement:', updated.ferme_manuellement);
    } else {
      console.log('✅ Le restaurant est déjà ouvert !');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

verifierOuvrirOToasty();


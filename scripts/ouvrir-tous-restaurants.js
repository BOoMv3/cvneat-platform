#!/usr/bin/env node

/**
 * Met ferme_manuellement = false pour TOUS les restaurants.
 * Usage: node scripts/ouvrir-tous-restaurants.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ouvrirTousRestaurants() {
  try {
    console.log('🔍 Liste des restaurants...\n');

    const { data: restaurants, error: listError } = await supabase
      .from('restaurants')
      .select('id, nom, ferme_manuellement');

    if (listError) {
      console.error('❌ Erreur lecture restaurants:', listError.message);
      process.exit(1);
    }

    if (!restaurants || restaurants.length === 0) {
      console.log('Aucun restaurant trouvé.');
      process.exit(0);
    }

    let ok = 0;
    for (const r of restaurants) {
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          ferme_manuellement: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', r.id);
      if (updateError) {
        console.error(`❌ ${r.nom} (${r.id}):`, updateError.message);
        continue;
      }
      console.log(`   ✅ ${r.nom} (${r.id})`);
      ok++;
    }
    console.log(`\n✅ ${ok}/${restaurants.length} restaurant(s) ouverts (ferme_manuellement = false).`);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

ouvrirTousRestaurants();

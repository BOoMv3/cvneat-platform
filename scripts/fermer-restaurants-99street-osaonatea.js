#!/usr/bin/env node

/**
 * Script pour fermer les restaurants "99 Street Food" et "O'Saona Tea"
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/fermer-restaurants-99street-osaonatea.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fermerRestaurants() {
  try {
    console.log('🔍 Recherche des restaurants...\n');

    // Rechercher "99 Street Food"
    const { data: restaurant99, error: error99 } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .ilike('nom', '%99%street%food%')
      .single();

    if (error99 || !restaurant99) {
      console.error('❌ Restaurant "99 Street Food" non trouvé.');
    } else {
      console.log(`📝 Fermeture du restaurant: ${restaurant99.nom} (ID: ${restaurant99.id})`);
      const { data: updated99, error: updateError99 } = await supabaseAdmin
        .from('restaurants')
        .update({
          ferme_manuellement: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurant99.id)
        .select()
        .single();

      if (updateError99) {
        console.error('❌ Erreur lors de la fermeture:', updateError99);
      } else {
        console.log('✅ Restaurant fermé avec succès !');
        console.log('   Nom:', updated99.nom);
        console.log('   Fermé manuellement:', updated99.ferme_manuellement);
      }
    }

    console.log('\n');

    // Rechercher "O'Saona Tea" avec plusieurs variantes
    const { data: restaurantsOsaona, error: errorOsaona } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .or('nom.ilike.%osaona%,nom.ilike.%saona%,nom.ilike.%osaona%tea%');

    const restaurantOsaona = restaurantsOsaona && restaurantsOsaona.length > 0 ? restaurantsOsaona[0] : null;

    if (errorOsaona || !restaurantOsaona) {
      console.error('❌ Restaurant "O\'Saona Tea" non trouvé.');
    } else {
      console.log(`📝 Fermeture du restaurant: ${restaurantOsaona.nom} (ID: ${restaurantOsaona.id})`);
      const { data: updatedOsaona, error: updateErrorOsaona } = await supabaseAdmin
        .from('restaurants')
        .update({
          ferme_manuellement: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurantOsaona.id)
        .select()
        .single();

      if (updateErrorOsaona) {
        console.error('❌ Erreur lors de la fermeture:', updateErrorOsaona);
      } else {
        console.log('✅ Restaurant fermé avec succès !');
        console.log('   Nom:', updatedOsaona.nom);
        console.log('   Fermé manuellement:', updatedOsaona.ferme_manuellement);
      }
    }

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    process.exit(1);
  }
}

fermerRestaurants();


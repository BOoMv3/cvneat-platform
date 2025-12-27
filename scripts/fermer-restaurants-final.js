#!/usr/bin/env node

/**
 * Script pour fermer les restaurants "99 Street Food" et "O'Saona Tea"
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/fermer-restaurants-final.js
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

    // Fermer "99 Street Food"
    const { data: restaurant99, error: error99 } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .ilike('nom', '%99%street%food%')
      .single();

    if (error99 || !restaurant99) {
      console.error('❌ Restaurant "99 Street Food" non trouvé.');
    } else {
      if (restaurant99.ferme_manuellement === true) {
        console.log(`ℹ️  "99 Street Food" est déjà fermé.`);
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
    }

    console.log('\n');

    // Fermer "O'Saona Tea" / "Ô SAONA TEA"
    const { data: restaurantsOsaona, error: errorOsaona } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .or('nom.ilike.%osaona%,nom.ilike.%saona%');

    if (errorOsaona || !restaurantsOsaona || restaurantsOsaona.length === 0) {
      console.error('❌ Restaurant "O\'Saona Tea" non trouvé.');
    } else {
      const restaurantOsaona = restaurantsOsaona[0];
      if (restaurantOsaona.ferme_manuellement === true) {
        console.log(`ℹ️  "${restaurantOsaona.nom}" est déjà fermé.`);
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
    }

    console.log('\n✅ Opération terminée !');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    process.exit(1);
  }
}

fermerRestaurants();


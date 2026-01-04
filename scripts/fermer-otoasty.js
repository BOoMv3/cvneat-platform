#!/usr/bin/env node

/**
 * Script pour fermer O'Toasty manuellement
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/fermer-otoasty.js
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

async function fermerOToasty() {
  try {
    console.log('🔍 Recherche du restaurant O\'Toasty...\n');

    const restaurantName = 'O\'Toasty';

    const { data: restaurant, error: fetchError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .ilike('nom', `%${restaurantName}%`)
      .single();

    if (fetchError || !restaurant) {
      console.error(`❌ Restaurant "${restaurantName}" non trouvé.`);
      console.error('Erreur:', fetchError);
      process.exit(1);
    }

    console.log(`📋 Restaurant trouvé: ${restaurant.nom}`);
    console.log(`   ID: ${restaurant.id}`);
    console.log(`   ferme_manuellement actuel: ${restaurant.ferme_manuellement}\n`);

    if (restaurant.ferme_manuellement === true) {
      console.log(`✅ Le restaurant "${restaurant.nom}" est déjà fermé manuellement.`);
      process.exit(0);
    }

    console.log(`📝 Fermeture du restaurant...\n`);

    const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({
        ferme_manuellement: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurant.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur lors de la fermeture:', updateError);
      process.exit(1);
    }

    console.log('✅ Restaurant fermé manuellement avec succès !');
    console.log('   Nom:', updatedRestaurant.nom);
    console.log('   ferme_manuellement:', updatedRestaurant.ferme_manuellement);

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    process.exit(1);
  }
}

fermerOToasty();


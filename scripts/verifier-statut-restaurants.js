#!/usr/bin/env node

/**
 * Script pour vérifier le statut des restaurants "99 Street Food" et "O'Saona Tea"
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/verifier-statut-restaurants.js
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

async function verifierStatut() {
  try {
    console.log('🔍 Vérification du statut des restaurants...\n');

    // Vérifier "99 Street Food"
    const { data: restaurant99, error: error99 } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .ilike('nom', '%99%street%food%')
      .single();

    if (restaurant99) {
      console.log(`📋 99 Street Food:`);
      console.log(`   ID: ${restaurant99.id}`);
      console.log(`   Nom: ${restaurant99.nom}`);
      console.log(`   ferme_manuellement: ${restaurant99.ferme_manuellement} (type: ${typeof restaurant99.ferme_manuellement})\n`);
      
      if (restaurant99.ferme_manuellement !== true) {
        console.log('⚠️  Le restaurant n\'est PAS fermé, fermeture en cours...');
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('restaurants')
          .update({
            ferme_manuellement: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', restaurant99.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Erreur:', updateError);
        } else {
          console.log('✅ Restaurant fermé avec succès !\n');
        }
      }
    }

    // Vérifier "O'Saona Tea"
    const { data: restaurantsOsaona, error: errorOsaona } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .or('nom.ilike.%osaona%,nom.ilike.%saona%');

    if (restaurantsOsaona && restaurantsOsaona.length > 0) {
      const restaurantOsaona = restaurantsOsaona[0];
      console.log(`📋 ${restaurantOsaona.nom}:`);
      console.log(`   ID: ${restaurantOsaona.id}`);
      console.log(`   ferme_manuellement: ${restaurantOsaona.ferme_manuellement} (type: ${typeof restaurantOsaona.ferme_manuellement})\n`);
      
      if (restaurantOsaona.ferme_manuellement !== true) {
        console.log('⚠️  Le restaurant n\'est PAS fermé, fermeture en cours...');
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('restaurants')
          .update({
            ferme_manuellement: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', restaurantOsaona.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('❌ Erreur:', updateError);
        } else {
          console.log('✅ Restaurant fermé avec succès !\n');
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

verifierStatut();


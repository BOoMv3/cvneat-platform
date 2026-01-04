#!/usr/bin/env node

/**
 * Script pour vérifier et ouvrir Ô SAONA TEA manuellement
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/verifier-ouvrir-osaona-tea.js
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

async function verifierEtOuvrirOSaonaTea() {
  try {
    console.log('🔍 Recherche du restaurant Ô SAONA TEA...\n');

    const restaurantNames = ['Ô SAONA TEA', 'O\'SAONA TEA', 'O SAONA TEA', 'osaona tea'];

    let restaurant = null;
    for (const name of restaurantNames) {
      const { data: found, error } = await supabaseAdmin
        .from('restaurants')
        .select('id, nom, ferme_manuellement')
        .ilike('nom', `%${name}%`)
        .maybeSingle();
      
      if (found && !restaurant) {
        restaurant = found;
        break;
      }
    }

    // Si toujours pas trouvé, chercher avec l'ID connu
    if (!restaurant) {
      const knownId = 'b824ce32-1ae1-443b-be2a-773b3d2f389b';
      const { data: foundById, error: idError } = await supabaseAdmin
        .from('restaurants')
        .select('id, nom, ferme_manuellement')
        .eq('id', knownId)
        .maybeSingle();
      
      if (foundById) {
        restaurant = foundById;
      }
    }

    if (!restaurant) {
      console.error('❌ Restaurant Ô SAONA TEA non trouvé.');
      process.exit(1);
    }

    console.log(`📋 Restaurant trouvé: ${restaurant.nom}`);
    console.log(`   ID: ${restaurant.id}`);
    console.log(`   ferme_manuellement actuel: ${restaurant.ferme_manuellement} (type: ${typeof restaurant.ferme_manuellement})\n`);

    if (restaurant.ferme_manuellement === false) {
      console.log(`✅ Le restaurant "${restaurant.nom}" est déjà en mode ouverture manuelle (ferme_manuellement = false).`);
      console.log(`   Il devrait apparaître ouvert selon ses horaires.`);
    } else {
      console.log(`⚠️  Le restaurant "${restaurant.nom}" est fermé manuellement ou en mode automatique.`);
      console.log(`   Passage en ouverture manuelle (ferme_manuellement = false)...\n`);

      const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
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

      console.log('✅ Restaurant mis en ouverture manuelle avec succès !');
      console.log('   Nom:', updatedRestaurant.nom);
      console.log('   ferme_manuellement:', updatedRestaurant.ferme_manuellement);
      console.log('   Le restaurant apparaîtra ouvert selon ses horaires.');
    }

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    process.exit(1);
  }
}

verifierEtOuvrirOSaonaTea();


#!/usr/bin/env node

/**
 * Script pour vérifier le statut de "La Bonne Pâte"
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/verifier-bonne-pate.js
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

async function verifierBonnePate() {
  try {
    console.log('🔍 Vérification du statut de "La Bonne Pâte"...\n');

    const { data: restaurants, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .ilike('nom', '%bonne%pate%');

    if (error || !restaurants || restaurants.length === 0) {
      console.error('❌ Restaurant non trouvé:', error);
      process.exit(1);
    }

    console.log(`📋 ${restaurants.length} restaurant(s) trouvé(s) :\n`);

    restaurants.forEach(restaurant => {

    if (error || !restaurant) {
      console.error('❌ Restaurant non trouvé:', error);
      process.exit(1);
    }

      console.log(`📋 Restaurant: ${restaurant.nom}`);
      console.log(`   ID: ${restaurant.id}`);
      console.log(`   ferme_manuellement: ${restaurant.ferme_manuellement} (type: ${typeof restaurant.ferme_manuellement})`);
      console.log(`   Valeur stricte true: ${restaurant.ferme_manuellement === true}`);
      console.log(`   Valeur stricte false: ${restaurant.ferme_manuellement === false}`);
      console.log(`   Valeur truthy: ${!!restaurant.ferme_manuellement}`);
      console.log(`   Valeur falsy: ${!restaurant.ferme_manuellement}`);

      if (restaurant.ferme_manuellement !== true) {
        console.log('   ⚠️  Le restaurant n\'est PAS fermé manuellement dans la base de données.');
        console.log('   Pour le fermer, ferme_manuellement doit être exactement true (booléen).');
      } else {
        console.log('   ✅ Le restaurant est bien fermé manuellement dans la base de données.');
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

verifierBonnePate();


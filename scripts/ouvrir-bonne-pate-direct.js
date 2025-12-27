#!/usr/bin/env node

/**
 * Script pour ouvrir le restaurant "La Bonne Pâte" directement via la clé de service Supabase.
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/ouvrir-bonne-pate-direct.js
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

async function ouvrirBonnePate() {
  try {
    console.log('🔍 Recherche du restaurant La Bonne Pâte...');

    const restaurantName = 'La Bonne Pâte'; // Nom exact ou partie du nom

    const { data: restaurant, error: fetchError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .ilike('nom', `%${restaurantName}%`) // Recherche insensible à la casse
      .single();

    if (fetchError || !restaurant) {
      console.error(`❌ Restaurant "${restaurantName}" non trouvé.`);
      process.exit(1);
    }

    if (restaurant.ferme_manuellement === false) {
      console.log(`✅ Le restaurant "${restaurant.nom}" (ID: ${restaurant.id}) est déjà ouvert.`);
      process.exit(0);
    }

    console.log(`📝 Ouverture du restaurant: ${restaurant.nom} (ID: ${restaurant.id})`);

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
      console.error('❌ Erreur lors de l\'ouverture du restaurant:', updateError);
      process.exit(1);
    }

    console.log('✅ Restaurant ouvert avec succès !');
    console.log('   Nom:', updatedRestaurant.nom);
    console.log('   Fermé manuellement:', updatedRestaurant.ferme_manuellement);

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    process.exit(1);
  }
}

ouvrirBonnePate();


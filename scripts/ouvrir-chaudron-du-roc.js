#!/usr/bin/env node

/**
 * Script pour ouvrir "Le Chaudron du Roc" (mettre ferme_manuellement = null)
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/ouvrir-chaudron-du-roc.js
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

async function ouvrirChaudronDuRoc() {
  try {
    console.log('🔍 Recherche du restaurant "Le Chaudron du Roc"...');

    const restaurantName = 'Le Chaudron du Roc';

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
    console.log(`   ferme_manuellement actuel: ${restaurant.ferme_manuellement} (type: ${typeof restaurant.ferme_manuellement})`);

    if (restaurant.ferme_manuellement === null) {
      console.log(`✅ Le restaurant "${restaurant.nom}" est déjà en mode automatique (ferme_manuellement = null).`);
      console.log(`   Il s'ouvrira et se fermera automatiquement selon ses horaires.`);
      process.exit(0);
    }

    console.log(`📝 Passage en mode automatique (ferme_manuellement = null)...`);

    const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({
        ferme_manuellement: null, // null = mode automatique (suit les horaires)
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurant.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      process.exit(1);
    }

    console.log('✅ Restaurant mis en mode automatique avec succès !');
    console.log('   Nom:', updatedRestaurant.nom);
    console.log('   ferme_manuellement:', updatedRestaurant.ferme_manuellement);
    console.log('   Le restaurant s\'ouvrira et se fermera automatiquement selon ses horaires.');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    process.exit(1);
  }
}

ouvrirChaudronDuRoc();


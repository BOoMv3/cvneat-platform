#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function ouvrirSmaashBurger() {
  try {
    const { data: restaurant, error: fetchError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .ilike('nom', '%Smaash Burger%')
      .single();

    if (fetchError || !restaurant) {
      console.error('❌ Restaurant non trouvé:', fetchError);
      process.exit(1);
    }

    console.log(`📋 Restaurant: ${restaurant.nom}`);
    console.log(`   ID: ${restaurant.id}`);
    console.log(`   ferme_manuellement ACTUEL: ${restaurant.ferme_manuellement} (type: ${typeof restaurant.ferme_manuellement})`);

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
      console.error('❌ Erreur:', updateError);
      process.exit(1);
    }

    console.log(`\n✅ OUVERT !`);
    console.log(`   ferme_manuellement NOUVEAU: ${updatedRestaurant.ferme_manuellement}`);
    
    // Vérifier immédiatement après
    const { data: verify, error: verifyError } = await supabaseAdmin
      .from('restaurants')
      .select('nom, ferme_manuellement')
      .eq('id', restaurant.id)
      .single();
    
    console.log(`\n🔍 VÉRIFICATION IMMÉDIATE:`);
    console.log(`   ferme_manuellement: ${verify.ferme_manuellement} (type: ${typeof verify.ferme_manuellement})`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

ouvrirSmaashBurger();

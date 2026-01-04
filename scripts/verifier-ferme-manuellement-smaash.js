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

async function verifier() {
  try {
    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement, updated_at')
      .ilike('nom', '%Smaash Burger%')
      .single();

    if (error || !restaurant) {
      console.error('❌ Restaurant non trouvé:', error);
      process.exit(1);
    }

    console.log(`📋 Restaurant: ${restaurant.nom}`);
    console.log(`   ID: ${restaurant.id}`);
    console.log(`   ferme_manuellement: ${restaurant.ferme_manuellement} (type: ${typeof restaurant.ferme_manuellement})`);
    console.log(`   ferme_manuellement === true: ${restaurant.ferme_manuellement === true}`);
    console.log(`   ferme_manuellement === false: ${restaurant.ferme_manuellement === false}`);
    console.log(`   updated_at: ${restaurant.updated_at}`);

    // Tester la mise à jour
    console.log('\n🔄 Test de mise à jour à false...');
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({
        ferme_manuellement: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurant.id)
      .select('id, nom, ferme_manuellement, updated_at')
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError);
      process.exit(1);
    }

    console.log(`✅ Après mise à jour:`);
    console.log(`   ferme_manuellement: ${updated.ferme_manuellement} (type: ${typeof updated.ferme_manuellement})`);
    console.log(`   ferme_manuellement === false: ${updated.ferme_manuellement === false}`);
    console.log(`   updated_at: ${updated.updated_at}`);

    // Vérifier immédiatement après
    const { data: verify, error: verifyError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .eq('id', restaurant.id)
      .single();

    if (verifyError) {
      console.error('❌ Erreur vérification:', verifyError);
      process.exit(1);
    }

    console.log(`\n🔍 Vérification immédiate:`);
    console.log(`   ferme_manuellement: ${verify.ferme_manuellement} (type: ${typeof verify.ferme_manuellement})`);
    console.log(`   ferme_manuellement === false: ${verify.ferme_manuellement === false}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

verifier();

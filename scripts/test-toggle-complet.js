#!/usr/bin/env node

/**
 * Script pour tester complètement le flux toggle ferme_manuellement
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testToggle() {
  try {
    const restaurantId = '263b0421-112e-4d16-95c7-4deef6f5ff42'; // Smaash Burger
    
    console.log('🧪 TEST COMPLET DU TOGGLE\n');
    
    // 1. Lire l'état actuel
    console.log('1️⃣ Lecture état actuel...');
    const { data: current, error: readError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .eq('id', restaurantId)
      .single();
    
    if (readError || !current) {
      console.error('❌ Erreur lecture:', readError);
      process.exit(1);
    }
    
    console.log(`   État actuel: ferme_manuellement = ${current.ferme_manuellement} (type: ${typeof current.ferme_manuellement})`);
    
    // 2. Tester toggle vers true
    console.log('\n2️⃣ Test toggle vers TRUE (fermer)...');
    const { data: updated1, error: updateError1 } = await supabaseAdmin
      .from('restaurants')
      .update({
        ferme_manuellement: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurantId)
      .select('id, nom, ferme_manuellement')
      .single();
    
    if (updateError1) {
      console.error('❌ Erreur update 1:', updateError1);
      process.exit(1);
    }
    
    console.log(`   ✅ Après update: ferme_manuellement = ${updated1.ferme_manuellement} (type: ${typeof updated1.ferme_manuellement})`);
    console.log(`   ✅ Vérification: ${updated1.ferme_manuellement === true ? 'CORRECT' : 'ERREUR'}`);
    
    // 3. Vérifier immédiatement
    const { data: verify1, error: verifyError1 } = await supabaseAdmin
      .from('restaurants')
      .select('ferme_manuellement')
      .eq('id', restaurantId)
      .single();
    
    console.log(`   🔍 Vérification DB: ferme_manuellement = ${verify1.ferme_manuellement} (type: ${typeof verify1.ferme_manuellement})`);
    
    // 4. Tester toggle vers false
    console.log('\n3️⃣ Test toggle vers FALSE (ouvrir)...');
    const { data: updated2, error: updateError2 } = await supabaseAdmin
      .from('restaurants')
      .update({
        ferme_manuellement: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurantId)
      .select('id, nom, ferme_manuellement')
      .single();
    
    if (updateError2) {
      console.error('❌ Erreur update 2:', updateError2);
      process.exit(1);
    }
    
    console.log(`   ✅ Après update: ferme_manuellement = ${updated2.ferme_manuellement} (type: ${typeof updated2.ferme_manuellement})`);
    console.log(`   ✅ Vérification: ${updated2.ferme_manuellement === false ? 'CORRECT' : 'ERREUR'}`);
    
    // 5. Vérifier immédiatement
    const { data: verify2, error: verifyError2 } = await supabaseAdmin
      .from('restaurants')
      .select('ferme_manuellement')
      .eq('id', restaurantId)
      .single();
    
    console.log(`   🔍 Vérification DB: ferme_manuellement = ${verify2.ferme_manuellement} (type: ${typeof verify2.ferme_manuellement})`);
    
    console.log('\n✅ Tests terminés');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testToggle();

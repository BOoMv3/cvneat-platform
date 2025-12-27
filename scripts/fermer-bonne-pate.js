#!/usr/bin/env node

/**
 * Script pour fermer "La Bonne Pâte"
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/fermer-bonne-pate.js
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

async function fermerBonnePate() {
  try {
    console.log('🔍 Recherche de "La Bonne Pâte"...\n');

    // Rechercher avec différentes variantes
    const { data: restaurants, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .or('nom.ilike.%bonne%,nom.ilike.%pate%,nom.ilike.%pâte%');

    if (error) {
      console.error('❌ Erreur lors de la recherche:', error);
      process.exit(1);
    }

    if (!restaurants || restaurants.length === 0) {
      console.error('❌ Aucun restaurant trouvé.');
      process.exit(1);
    }

    console.log(`📋 ${restaurants.length} restaurant(s) trouvé(s) :\n`);

    // Filtrer pour trouver "La Bonne Pâte"
    const bonnePate = restaurants.find(r => 
      r.nom.toLowerCase().includes('bonne') && 
      (r.nom.toLowerCase().includes('pate') || r.nom.toLowerCase().includes('pâte'))
    );

    if (!bonnePate) {
      console.log('Restaurants trouvés :');
      restaurants.forEach(r => console.log(`  - ${r.nom} (ID: ${r.id})`));
      console.error('\n❌ "La Bonne Pâte" non trouvé parmi les résultats.');
      process.exit(1);
    }

    console.log(`📋 Restaurant: ${bonnePate.nom}`);
    console.log(`   ID: ${bonnePate.id}`);
    console.log(`   ferme_manuellement actuel: ${bonnePate.ferme_manuellement} (type: ${typeof bonnePate.ferme_manuellement})\n`);

    if (bonnePate.ferme_manuellement === true) {
      console.log('✅ Le restaurant est déjà fermé manuellement.');
      process.exit(0);
    }

    console.log('📝 Fermeture du restaurant...');
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({
        ferme_manuellement: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', bonnePate.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur lors de la fermeture:', updateError);
      process.exit(1);
    }

    console.log('✅ Restaurant fermé avec succès !');
    console.log('   Nom:', updated.nom);
    console.log('   Fermé manuellement:', updated.ferme_manuellement);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

fermerBonnePate();


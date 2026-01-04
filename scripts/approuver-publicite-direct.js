const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function approuverPublicite() {
  console.log('🔍 Recherche de la publicité "Bonne année 2026 avec CVN\'EAT ! 🎉"...\n');

  try {
    // Trouver la publicité par son titre
    const { data: ads, error: searchError } = await supabase
      .from('advertisements')
      .select('*')
      .ilike('title', '%Bonne année 2026%')
      .limit(1);

    if (searchError) {
      console.error('❌ Erreur lors de la recherche:', searchError);
      return;
    }

    if (!ads || ads.length === 0) {
      console.log('❌ Publicité non trouvée');
      return;
    }

    const ad = ads[0];
    console.log(`📋 Publicité trouvée: ${ad.title}`);
    console.log(`   ID: ${ad.id}`);
    console.log(`   Status actuel: ${ad.status}`);
    console.log(`   Payment status actuel: ${ad.payment_status}`);

    // Mettre à jour le statut
    const { data: updatedAd, error: updateError } = await supabase
      .from('advertisements')
      .update({
        status: 'approved',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', ad.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
      return;
    }

    console.log('\n✅ Publicité approuvée avec succès !');
    console.log(`   Nouveau status: ${updatedAd.status}`);
    console.log(`   Nouveau payment_status: ${updatedAd.payment_status}`);
    console.log('\n🎉 La publicité devrait maintenant s\'afficher sur la page d\'accueil !');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

approuverPublicite();


const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifierPublicites() {
  console.log('🔍 Vérification des publicités...\n');

  try {
    // Récupérer toutes les publicités actives
    const { data: ads, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }

    if (!ads || ads.length === 0) {
      console.log('ℹ️ Aucune publicité active trouvée');
      return;
    }

    console.log(`📊 ${ads.length} publicité(s) active(s) trouvée(s)\n`);

    const today = new Date().toISOString().split('T')[0];

    for (const ad of ads) {
      console.log(`\n📋 Publicité: ${ad.title || 'Sans titre'} (ID: ${ad.id?.slice(0, 8)})`);
      console.log(`   Position: ${ad.position}`);
      console.log(`   is_active: ${ad.is_active}`);
      console.log(`   status: ${ad.status || 'NULL'}`);
      console.log(`   payment_status: ${ad.payment_status || 'NULL'}`);
      console.log(`   start_date: ${ad.start_date || 'NULL'}`);
      console.log(`   end_date: ${ad.end_date || 'NULL'}`);
      console.log(`   image_url: ${ad.image_url ? 'Oui' : 'NON (PROBLÈME!)'}`);

      // Vérifier les conditions d'affichage
      const checks = [];

      // Check 1: Status
      if (ad.status === 'approved' || ad.status === 'active') {
        checks.push('✅ Status valide (approved/active)');
      } else if (ad.status === 'pending_approval' && ad.payment_status === 'paid') {
        checks.push('✅ Status pending_approval avec paiement payé');
      } else {
        checks.push(`❌ Status invalide: ${ad.status || 'NULL'} (doit être 'approved', 'active', ou 'pending_approval' avec payment_status='paid')`);
      }

      // Check 2: Dates
      const startDate = ad.start_date ? new Date(ad.start_date).toISOString().split('T')[0] : null;
      const endDate = ad.end_date ? new Date(ad.end_date).toISOString().split('T')[0] : null;
      
      if ((!startDate || today >= startDate) && (!endDate || today <= endDate)) {
        checks.push('✅ Dates valides');
      } else {
        if (startDate && today < startDate) {
          checks.push(`❌ Date de début dans le futur: ${startDate} (aujourd'hui: ${today})`);
        }
        if (endDate && today > endDate) {
          checks.push(`❌ Date de fin dépassée: ${endDate} (aujourd'hui: ${today})`);
        }
      }

      // Check 3: Position
      const validPositions = ['banner_middle', 'footer'];
      if (validPositions.includes(ad.position)) {
        checks.push(`✅ Position valide: ${ad.position}`);
      } else {
        checks.push(`❌ Position invalide: ${ad.position} (doit être 'banner_middle' ou 'footer')`);
      }

      // Check 4: Image
      if (ad.image_url) {
        checks.push('✅ Image URL présente');
      } else {
        checks.push('❌ Image URL manquante (la publicité ne s\'affichera pas sans image)');
      }

      console.log('\n   Vérifications:');
      checks.forEach(check => console.log(`   ${check}`));

      // Résultat global
      const hasErrors = checks.some(check => check.startsWith('❌'));
      if (!hasErrors) {
        console.log(`\n   ✅ Cette publicité DEVRAIT s'afficher !`);
      } else {
        console.log(`\n   ❌ Cette publicité NE s'affichera PAS (voir erreurs ci-dessus)`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

verifierPublicites();


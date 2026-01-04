const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifierDates() {
  console.log('🔍 Vérification des dates de la publicité...\n');

  try {
    const { data: ads, error } = await supabase
      .from('advertisements')
      .select('*')
      .ilike('title', '%Bonne année 2026%')
      .limit(1);

    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }

    if (!ads || ads.length === 0) {
      console.log('❌ Publicité non trouvée');
      return;
    }

    const ad = ads[0];
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
    
    const startDate = ad.start_date ? new Date(ad.start_date).toISOString().split('T')[0] : null;
    const endDate = ad.end_date ? new Date(ad.end_date).toISOString().split('T')[0] : null;

    console.log('📅 Dates:');
    console.log(`   Aujourd'hui (ISO): ${todayISO}`);
    console.log(`   Date de début: ${startDate || 'NULL'}`);
    console.log(`   Date de fin: ${endDate || 'NULL'}`);
    console.log(`   Date de début (objet Date): ${ad.start_date}`);
    console.log(`   Date de fin (objet Date): ${ad.end_date}`);

    // Vérifier la logique de comparaison
    const startDateOK = !startDate || todayISO >= startDate;
    const endDateOK = !endDate || todayISO <= endDate;

    console.log('\n🔍 Vérifications:');
    console.log(`   today >= startDate: ${todayISO} >= ${startDate} = ${startDateOK}`);
    console.log(`   today <= endDate: ${todayISO} <= ${endDate} = ${endDateOK}`);
    console.log(`   Résultat global: ${startDateOK && endDateOK ? '✅ OK' : '❌ PAS OK'}`);

    if (startDateOK && endDateOK) {
      console.log('\n✅ Les dates sont correctes, la publicité devrait s\'afficher !');
    } else {
      console.log('\n❌ Les dates ne sont pas dans la plage valide.');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

verifierDates();


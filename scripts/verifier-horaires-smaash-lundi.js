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

async function verifierHorairesSmaashLundi() {
  try {
    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement, horaires')
      .ilike('nom', '%Smaash Burger%')
      .single();

    if (error || !restaurant) {
      console.error('❌ Restaurant non trouvé:', error);
      process.exit(1);
    }

    console.log(`📋 Restaurant: ${restaurant.nom}`);
    console.log(`   ferme_manuellement: ${restaurant.ferme_manuellement}`);
    
    let horaires = restaurant.horaires;
    if (typeof horaires === 'string') {
      try {
        horaires = JSON.parse(horaires);
      } catch (e) {
        console.error('❌ Erreur parsing:', e);
        process.exit(1);
      }
    }

    // Vérifier les horaires du lundi
    const variants = ['lundi', 'Lundi', 'LUNDI'];
    let heuresLundi = null;
    for (const key of variants) {
      if (horaires?.[key]) {
        heuresLundi = horaires[key];
        console.log(`\n📅 Horaires LUNDI trouvés avec clé "${key}":`);
        console.log(JSON.stringify(heuresLundi, null, 2));
        break;
      }
    }

    if (!heuresLundi) {
      console.log('\n⚠️ Pas d\'horaires pour lundi trouvés');
      console.log('Clés disponibles:', Object.keys(horaires || {}));
    } else {
      // Vérifier l'heure actuelle
      const now = new Date();
      const frTime = now.toLocaleString('fr-FR', { 
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const [currentHours, currentMinutes] = frTime.split(':').map(Number);
      const currentTime = currentHours * 60 + currentMinutes;
      
      console.log(`\n🕐 Heure actuelle (Paris): ${frTime} (${currentTime} minutes)`);
      
      if (Array.isArray(heuresLundi.plages) && heuresLundi.plages.length > 0) {
        console.log('\n📊 Vérification des plages:');
        for (const plage of heuresLundi.plages) {
          const [h1, m1] = plage.ouverture.split(':').map(Number);
          const [h2, m2] = plage.fermeture.split(':').map(Number);
          const start = h1 * 60 + m1;
          const end = h2 * 60 + m2;
          const inPlage = currentTime >= start && currentTime <= end;
          console.log(`   ${plage.ouverture} - ${plage.fermeture}: ${inPlage ? '✅ DANS LA PLAGE' : '❌ HORS PLAGE'}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

verifierHorairesSmaashLundi();

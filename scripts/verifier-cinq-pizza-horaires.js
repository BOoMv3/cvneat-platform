#!/usr/bin/env node

/**
 * Script pour vérifier les horaires de "Le Cinq Pizza Shop"
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/verifier-cinq-pizza-horaires.js
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

async function verifierCinqPizza() {
  try {
    console.log('🔍 Recherche de "Le Cinq Pizza Shop"...\n');

    const restaurantName = 'Le Cinq Pizza Shop';

    const { data: restaurant, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement, horaires')
      .ilike('nom', `%${restaurantName}%`)
      .single();

    if (error || !restaurant) {
      console.error(`❌ Restaurant "${restaurantName}" non trouvé.`);
      process.exit(1);
    }

    console.log(`📋 Restaurant: ${restaurant.nom}`);
    console.log(`   ID: ${restaurant.id}`);
    console.log(`   ferme_manuellement: ${restaurant.ferme_manuellement}\n`);

    // Obtenir le jour actuel
    const todayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' });
    const todayName = todayFormatter.format(new Date()).toLowerCase();
    console.log(`📅 Jour actuel: ${todayName.charAt(0).toUpperCase() + todayName.slice(1)}\n`);

    // Parser les horaires
    let horaires = restaurant.horaires;
    if (typeof horaires === 'string') {
      try {
        horaires = JSON.parse(horaires);
      } catch (e) {
        console.error('❌ Erreur parsing horaires:', e);
        process.exit(1);
      }
    }

    console.log('📊 Horaires complets:');
    console.log(JSON.stringify(horaires, null, 2));
    console.log('');

    // Afficher les horaires d'aujourd'hui
    const variants = [todayName, todayName.charAt(0).toUpperCase() + todayName.slice(1), todayName.toUpperCase()];
    let heuresJour = null;
    for (const key of variants) {
      if (horaires?.[key]) {
        heuresJour = horaires[key];
        break;
      }
    }

    if (heuresJour) {
      console.log(`🕐 Horaires d'aujourd'hui (${todayName}):`);
      if (Array.isArray(heuresJour.plages) && heuresJour.plages.length > 0) {
        heuresJour.plages.forEach((plage, index) => {
          console.log(`   Plage ${index + 1}: ${plage.ouverture} - ${plage.fermeture}`);
        });
      } else if (heuresJour.ouverture && heuresJour.fermeture) {
        console.log(`   ${heuresJour.ouverture} - ${heuresJour.fermeture}`);
      } else {
        console.log(`   ouvert: ${heuresJour.ouvert}`);
      }
    } else {
      console.log(`⚠️  Pas d'horaires configurés pour ${todayName}`);
    }

    // Obtenir l'heure actuelle
    const now = new Date();
    const frTime = now.toLocaleString('fr-FR', { 
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    console.log(`\n🕐 Heure actuelle: ${frTime}`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

verifierCinqPizza();


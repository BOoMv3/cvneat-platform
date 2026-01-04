#!/usr/bin/env node

/**
 * Script pour vérifier le statut d'ouverture du restaurant "Smaash Burger".
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/verifier-smaash-burger.js
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

async function verifierSmaashBurger() {
  try {
    console.log('🔍 Recherche du restaurant Smaash Burger...');

    const restaurantName = 'Smaash Burger';

    const { data: restaurant, error: fetchError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement, horaires')
      .ilike('nom', `%${restaurantName}%`)
      .single();

    if (fetchError || !restaurant) {
      console.error(`❌ Restaurant "${restaurantName}" non trouvé.`);
      console.error('Erreur:', fetchError);
      process.exit(1);
    }

    console.log(`\n📋 Restaurant trouvé: ${restaurant.nom}`);
    console.log(`   ID: ${restaurant.id}`);
    console.log(`   ferme_manuellement: ${restaurant.ferme_manuellement} (type: ${typeof restaurant.ferme_manuellement})`);
    
    // Afficher les horaires
    let horaires = restaurant.horaires;
    if (typeof horaires === 'string') {
      try {
        horaires = JSON.parse(horaires);
      } catch (e) {
        console.error('❌ Erreur parsing horaires:', e);
      }
    }
    
    console.log('\n📅 Horaires:');
    if (horaires) {
      const joursSemaine = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
      const todayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' });
      const todayName = todayFormatter.format(new Date()).toLowerCase();
      
      joursSemaine.forEach(jour => {
        const jourHoraire = horaires[jour] || horaires[jour.charAt(0).toUpperCase() + jour.slice(1)] || horaires[jour.toUpperCase()];
        if (jourHoraire) {
          const isToday = jour === todayName;
          const marker = isToday ? '👉 AUJOURD\'HUI' : '  ';
          
          if (Array.isArray(jourHoraire.plages) && jourHoraire.plages.length > 0) {
            const plagesStr = jourHoraire.plages.map(p => `${p.ouverture} - ${p.fermeture}`).join(', ');
            console.log(`   ${marker} ${jour}: ${plagesStr} ${jourHoraire.ouvert ? '(ouvert)' : '(fermé)'}`);
          } else if (jourHoraire.ouverture && jourHoraire.fermeture) {
            console.log(`   ${marker} ${jour}: ${jourHoraire.ouverture} - ${jourHoraire.fermeture} ${jourHoraire.ouvert ? '(ouvert)' : '(fermé)'}`);
          } else {
            console.log(`   ${marker} ${jour}: ${jourHoraire.ouvert ? 'Ouvert' : 'Fermé'}`);
          }
        } else {
          console.log(`      ${jour}: Pas de configuration`);
        }
      });
    } else {
      console.log('   Aucun horaire configuré');
    }

    // Vérifier l'heure actuelle
    const now = new Date();
    const frTime = now.toLocaleString('fr-FR', { 
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    console.log(`\n🕐 Heure actuelle (Paris): ${frTime}`);

    if (restaurant.ferme_manuellement === true) {
      console.log(`\n⚠️ Le restaurant "${restaurant.nom}" est fermé manuellement.`);
      console.log('   Il apparaîtra fermé même si ses horaires indiquent qu\'il devrait être ouvert.');
      console.log('   Pour l\'ouvrir, il faut mettre ferme_manuellement à false.');
    } else {
      console.log(`\n✅ Le restaurant "${restaurant.nom}" n'est PAS fermé manuellement.`);
      console.log('   Il devrait apparaître ouvert selon ses horaires.');
    }

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

verifierSmaashBurger();

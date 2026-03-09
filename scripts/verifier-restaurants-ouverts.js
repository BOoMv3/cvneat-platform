#!/usr/bin/env node

/**
 * Script pour vérifier quels restaurants devraient être ouverts mais sont fermés
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/verifier-restaurants-ouverts.js
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

// Fonction pour normaliser le nom
const normalizeName = (value = '') => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

// Fonction pour parser une heure
const parseTime = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Fonction pour vérifier si un restaurant devrait être ouvert
function checkShouldBeOpen(restaurant) {
  try {
    // Normaliser ferme_manuellement
    let fermeManuel = restaurant.ferme_manuellement;
    if (typeof fermeManuel === 'string') {
      fermeManuel = fermeManuel.toLowerCase() === 'true' || fermeManuel === '1';
    }
    const isManuallyClosed = fermeManuel === true || 
                             fermeManuel === 'true' || 
                             fermeManuel === '1' || 
                             fermeManuel === 1;
    
    // Si fermé manuellement, ne devrait pas être ouvert
    if (isManuallyClosed) {
      return { shouldBeOpen: false, reason: 'fermé_manuellement' };
    }
    
    // Vérifier les horaires
    let horaires = restaurant.horaires;
    if (!horaires) {
      return { shouldBeOpen: false, reason: 'pas_d_horaires' };
    }

    if (typeof horaires === 'string') {
      try { 
        horaires = JSON.parse(horaires); 
      } catch { 
        return { shouldBeOpen: false, reason: 'erreur_parsing_horaires' }; 
      }
    }

    // Obtenir le jour actuel
    const todayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Europe/Paris' });
    const todayName = todayFormatter.format(new Date()).toLowerCase();
    const variants = [todayName, todayName.charAt(0).toUpperCase() + todayName.slice(1), todayName.toUpperCase()];
    
    let heuresJour = null;
    for (const key of variants) {
      if (horaires?.[key]) {
        heuresJour = horaires[key];
        break;
      }
    }

    if (!heuresJour) {
      return { shouldBeOpen: false, reason: 'fermé_aujourd_hui' };
    }

    // Obtenir l'heure actuelle à Paris
    const now = new Date();
    const frTime = now.toLocaleString('fr-FR', { 
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const [currentHours, currentMinutes] = frTime.split(':').map(Number);
    const currentTime = currentHours * 60 + currentMinutes;

    // Vérifier les plages horaires
    let shouldBeOpenByHours = false;
    if (Array.isArray(heuresJour.plages) && heuresJour.plages.length > 0) {
      for (const plage of heuresJour.plages) {
        if (!plage.ouverture || !plage.fermeture) continue;
        
        const start = parseTime(plage.ouverture);
        let end = parseTime(plage.fermeture);
        
        if (start === null || end === null) continue;
        
        // Si la fermeture est à 00:00 (minuit), on la traite comme 24:00 (1440 minutes)
        const isMidnightClose = plage.fermeture === '00:00' || plage.fermeture === '0:00';
        if (isMidnightClose) {
          end = 24 * 60; // 1440 minutes
        }
        
        // Vérifier si on est dans cette plage horaire
        let inPlage;
        if (isMidnightClose) {
          inPlage = currentTime >= start;
        } else {
          inPlage = currentTime >= start && currentTime <= end;
        }
        
        if (inPlage) {
          shouldBeOpenByHours = true;
          break;
        }
      }
    } else if (heuresJour.ouverture && heuresJour.fermeture) {
      const start = parseTime(heuresJour.ouverture);
      let end = parseTime(heuresJour.fermeture);
      
      if (start !== null && end !== null) {
        const isMidnightClose = heuresJour.fermeture === '00:00' || heuresJour.fermeture === '0:00';
        if (isMidnightClose) {
          end = 24 * 60;
        }
        
        let inPlage;
        if (isMidnightClose) {
          inPlage = currentTime >= start;
        } else {
          inPlage = currentTime >= start && currentTime <= end;
        }
        
        if (inPlage) {
          shouldBeOpenByHours = true;
        }
      }
    } else if (heuresJour.ouvert === true) {
      shouldBeOpenByHours = true;
    }

    return { 
      shouldBeOpen: shouldBeOpenByHours, 
      reason: shouldBeOpenByHours ? 'ouvert_selon_horaires' : 'fermé_selon_horaires',
      currentTime: frTime
    };
  } catch (e) {
    console.error(`Erreur pour ${restaurant.nom}:`, e);
    return { shouldBeOpen: false, reason: 'erreur', error: e.message };
  }
}

async function verifierRestaurantsOuverts() {
  try {
    console.log('🔍 Vérification des restaurants qui devraient être ouverts...\n');

    const { data: restaurants, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement, horaires');

    if (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    }

    if (!restaurants || restaurants.length === 0) {
      console.log('⚠️  Aucun restaurant trouvé');
      return;
    }

    console.log(`📋 ${restaurants.length} restaurant(s) trouvé(s)\n`);

    const problemes = [];
    const ouverts = [];
    const fermesManuels = [];
    const fermesHoraires = [];

    restaurants.forEach(restaurant => {
      const check = checkShouldBeOpen(restaurant);
      const normalized = normalizeName(restaurant.nom);
      
      // Ignorer les restaurants en vacances
      const enVacances = ['99 street food', 'le cévenol burger', 'cévenol burger', 'cevenol burger', 'le cevenol burger', 'l\'assiette des saisons', 'assiette des saisons'].includes(normalized);
      const nonOperationnel = false;
      
      if (enVacances || nonOperationnel) {
        return; // Ignorer
      }

      if (check.shouldBeOpen) {
        ouverts.push({ restaurant, check });
      } else if (check.reason === 'fermé_manuellement') {
        fermesManuels.push({ restaurant, check });
      } else if (check.reason === 'fermé_selon_horaires' || check.reason === 'fermé_aujourd_hui') {
        fermesHoraires.push({ restaurant, check });
      } else {
        problemes.push({ restaurant, check });
      }
    });

    console.log(`\n✅ Restaurants qui devraient être OUVERTS (${ouverts.length}):`);
    ouverts.forEach(({ restaurant, check }) => {
      console.log(`   - ${restaurant.nom}`);
      console.log(`     heure actuelle: ${check.currentTime || 'N/A'}`);
      console.log(`     ferme_manuellement: ${restaurant.ferme_manuellement}`);
    });

    console.log(`\n🔒 Restaurants FERMÉS MANUELLEMENT (${fermesManuels.length}):`);
    fermesManuels.forEach(({ restaurant }) => {
      console.log(`   - ${restaurant.nom}`);
      console.log(`     ferme_manuellement: ${restaurant.ferme_manuellement}`);
    });

    console.log(`\n⏰ Restaurants FERMÉS selon horaires (${fermesHoraires.length}):`);
    fermesHoraires.forEach(({ restaurant, check }) => {
      console.log(`   - ${restaurant.nom}`);
      console.log(`     ferme_manuellement: ${restaurant.ferme_manuellement}, raison: ${check.reason}`);
      if (check.currentTime) {
        console.log(`     heure actuelle: ${check.currentTime}`);
      }
    });

    if (problemes.length > 0) {
      console.log(`\n⚠️  Restaurants avec PROBLÈMES (${problemes.length}):`);
      problemes.forEach(({ restaurant, check }) => {
        console.log(`   - ${restaurant.nom}`);
        console.log(`     ferme_manuellement: ${restaurant.ferme_manuellement}, raison: ${check.reason}`);
        if (check.error) {
          console.log(`     erreur: ${check.error}`);
        }
      });
    }

    console.log('\n✅ Vérification terminée');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

verifierRestaurantsOuverts();


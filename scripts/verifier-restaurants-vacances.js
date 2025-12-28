#!/usr/bin/env node

/**
 * Script pour vérifier les restaurants en vacances et leurs noms normalisés
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/verifier-restaurants-vacances.js
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

// Fonction de normalisation (identique à celle du frontend)
const normalizeName = (value = '') => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

async function verifierRestaurantsVacances() {
  try {
    console.log('🔍 Vérification des restaurants en vacances...\n');

    const restaurantsEnVacances = [
      '99 Street Food',
      'Le Cévenol Burger',
      'L\'Assiette des Saisons'
    ];

    for (const nomRecherche of restaurantsEnVacances) {
      console.log(`\n📋 Recherche: "${nomRecherche}"`);
      
      const { data: restaurants, error } = await supabaseAdmin
        .from('restaurants')
        .select('id, nom, ferme_manuellement')
        .or(`nom.ilike.%${nomRecherche}%,nom.ilike.%${nomRecherche.toLowerCase()}%`);

      if (error) {
        console.error(`   ❌ Erreur:`, error.message);
        continue;
      }

      if (!restaurants || restaurants.length === 0) {
        console.log(`   ⚠️  Aucun restaurant trouvé`);
        continue;
      }

      restaurants.forEach(restaurant => {
        const normalized = normalizeName(restaurant.nom);
        console.log(`   ✅ Trouvé: "${restaurant.nom}"`);
        console.log(`      ID: ${restaurant.id}`);
        console.log(`      Nom normalisé: "${normalized}"`);
        console.log(`      ferme_manuellement: ${restaurant.ferme_manuellement} (type: ${typeof restaurant.ferme_manuellement})`);
        console.log(`      Dans liste vacances: ${['99 street food', 'le cévenol burger', 'cévenol burger', 'cevenol burger', 'le cevenol burger', 'l\'assiette des saisons', 'assiette des saisons'].includes(normalized)}`);
      });
    }

    console.log('\n✅ Vérification terminée');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

verifierRestaurantsVacances();


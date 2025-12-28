#!/usr/bin/env node

/**
 * Script pour vérifier et fermer Le Cévenol Burger si nécessaire
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/verifier-cevenol-burger.js
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

const normalizeName = (value = '') => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

async function verifierCevenolBurger() {
  try {
    console.log('🔍 Recherche de "Le Cévenol Burger"...\n');

    const { data: restaurants, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, ferme_manuellement')
      .or('nom.ilike.%cévenol%,nom.ilike.%cevenol%');

    if (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    }

    if (!restaurants || restaurants.length === 0) {
      console.error('❌ Restaurant non trouvé');
      process.exit(1);
    }

    restaurants.forEach(restaurant => {
      const normalized = normalizeName(restaurant.nom);
      console.log(`📋 Restaurant: ${restaurant.nom}`);
      console.log(`   ID: ${restaurant.id}`);
      console.log(`   Nom normalisé: "${normalized}"`);
      console.log(`   ferme_manuellement: ${restaurant.ferme_manuellement} (type: ${typeof restaurant.ferme_manuellement})`);
      console.log(`   Dans liste vacances: ${['99 street food', 'le cévenol burger', 'cévenol burger', 'cevenol burger', 'le cevenol burger', 'l\'assiette des saisons', 'assiette des saisons'].includes(normalized)}`);
      console.log('');

      if (restaurant.ferme_manuellement !== true) {
        console.log(`⚠️  "${restaurant.nom}" n'est PAS fermé manuellement.`);
        console.log(`   Pour l'afficher en congés, il faut mettre ferme_manuellement = true`);
      } else {
        console.log(`✅ "${restaurant.nom}" est bien fermé manuellement.`);
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

verifierCevenolBurger();


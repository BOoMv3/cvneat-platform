#!/usr/bin/env node

/**
 * Script pour ajouter "Viande hachée" aux options de viande des tacos O'Toasty
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  try {
    const envFile = readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !SUPABASE_URL) SUPABASE_URL = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = value;
    });
  } catch (error) {
    console.error('Impossible de lire .env.local :', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables Supabase manquantes');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addViandeHachee() {
  console.log('🔍 Recherche du restaurant O\'Toasty...');
  
  // Trouver le restaurant O'Toasty
  const { data: restaurant, error: restoError } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom')
    .ilike('nom', '%O\'Toasty%')
    .single();

  if (restoError || !restaurant) {
    console.error('❌ Restaurant O\'Toasty non trouvé:', restoError);
    process.exit(1);
  }

  console.log(`✅ Restaurant trouvé: ${restaurant.nom} (${restaurant.id})`);

  // Trouver tous les tacos (M, L, XL)
  const { data: tacos, error: tacosError } = await supabaseAdmin
    .from('menus')
    .select('id, nom, meat_options')
    .eq('restaurant_id', restaurant.id)
    .or('nom.ilike.%Tacos M%,nom.ilike.%Tacos L%,nom.ilike.%Tacos XL%');

  if (tacosError) {
    console.error('❌ Erreur lors de la récupération des tacos:', tacosError);
    process.exit(1);
  }

  if (!tacos || tacos.length === 0) {
    console.error('❌ Aucun taco trouvé');
    process.exit(1);
  }

  console.log(`📋 ${tacos.length} tacos trouvés`);

  // Ajouter "Viande hachée" à chaque taco
  for (const taco of tacos) {
    let meatOptions = taco.meat_options || [];
    
    // Vérifier si "viande hachée" existe déjà
    const hasViandeHachee = meatOptions.some(meat => 
      meat.id === 'viande-hachee' || 
      meat.id === 'viande-hachée' ||
      meat.nom?.toLowerCase().includes('viande hachée') ||
      meat.nom?.toLowerCase().includes('viande hachee')
    );

    if (hasViandeHachee) {
      console.log(`ℹ️  "${taco.nom}" a déjà "Viande hachée"`);
      continue;
    }

    // Ajouter "Viande hachée"
    meatOptions.push({
      id: 'viande-hachee',
      nom: 'Viande hachée',
      prix: 0
    });

    // Mettre à jour dans la base de données
    const { error: updateError } = await supabaseAdmin
      .from('menus')
      .update({ meat_options: meatOptions })
      .eq('id', taco.id);

    if (updateError) {
      console.error(`❌ Erreur mise à jour "${taco.nom}":`, updateError);
    } else {
      console.log(`✅ "Viande hachée" ajoutée à "${taco.nom}"`);
    }
  }

  console.log('\n✅ Terminé !');
}

addViandeHachee().catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});


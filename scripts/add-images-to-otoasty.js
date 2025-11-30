#!/usr/bin/env node

/**
 * Script pour ajouter les images aux menus d'O'TOASTY
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
    envFile.split(/\r?\n/).forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (!SUPABASE_URL && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) SUPABASE_URL = value;
      if (!SUPABASE_SERVICE_KEY && key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value;
    });
  } catch (error) {
    console.error('Impossible de lire .env.local :', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables Supabase manquantes.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const RESTAURANT_NAME = "O'Toasty";

// Mapping des images par nom de menu
const menuImages = {
  // Tacos
  'Tacos M - 1 Viande': 'https://images.unsplash.com/photo-1601925260320-608c8d9f2307?auto=format&fit=crop&w=800&q=80',
  'Tacos L - 2 Viandes': 'https://images.unsplash.com/photo-1601925260320-608c8d9f2307?auto=format&fit=crop&w=800&q=80',
  'Tacos XL - 3 Viandes': 'https://images.unsplash.com/photo-1601925260320-608c8d9f2307?auto=format&fit=crop&w=800&q=80',
  
  // Tacos Signature
  'Le Chèvre Miel': 'https://images.unsplash.com/photo-1601925260320-608c8d9f2307?auto=format&fit=crop&w=800&q=80',
  'Le Montagnard': 'https://images.unsplash.com/photo-1601925260320-608c8d9f2307?auto=format&fit=crop&w=800&q=80',
  
  // Burgers
  'Cheese Burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  'Mini Tacos': 'https://images.unsplash.com/photo-1601925260320-608c8d9f2307?auto=format&fit=crop&w=800&q=80',
  
  // Texmex
  '6 Nuggets': 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
  '4 Bâtonnets de Mozzarella': 'https://images.unsplash.com/photo-1604908177266-79ea6b685fb0?auto=format&fit=crop&w=800&q=80',
  '3 Tenders': 'https://images.unsplash.com/photo-1625938145722-6489e5e02294?auto=format&fit=crop&w=800&q=80',
  '6 Wings': 'https://images.unsplash.com/photo-1608032362493-259c0e8a2c5b?auto=format&fit=crop&w=800&q=80',
  
  // Boissons (optionnel)
  'Coca-Cola': 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=400&q=80',
  'Orangina': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=80',
  'Oasis Tropical': 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80',
  'Capri-Sun': 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80',
  'Eau': 'https://images.unsplash.com/photo-1548839140-5a6d3c6863dc?auto=format&fit=crop&w=400&q=80',
  'Thé': 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=400&q=80'
};

async function main() {
  try {
    console.log('🔍 Recherche du restaurant O\'TOASTY...\n');

    // 1. Trouver le restaurant
    const { data: restaurants, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .ilike('nom', `%${RESTAURANT_NAME}%`);

    if (restaurantError) {
      throw new Error(`Erreur recherche restaurant: ${restaurantError.message}`);
    }

    if (!restaurants || restaurants.length === 0) {
      throw new Error(`Restaurant "${RESTAURANT_NAME}" non trouvé`);
    }

    const restaurant = restaurants[0];
    console.log(`✅ Restaurant trouvé: ${restaurant.nom} (ID: ${restaurant.id})\n`);

    // 2. Récupérer tous les menus
    console.log('📋 Récupération des menus...');
    const { data: menus, error: menusError } = await supabaseAdmin
      .from('menus')
      .select('id, nom, image_url')
      .eq('restaurant_id', restaurant.id);

    if (menusError) {
      throw new Error(`Erreur récupération menus: ${menusError.message}`);
    }

    console.log(`✅ ${menus.length} menus trouvés\n`);

    // 3. Mettre à jour les images
    console.log('🖼️  Ajout des images aux menus...\n');
    let updated = 0;

    for (const menu of menus) {
      const imageUrl = menuImages[menu.nom];
      
      if (imageUrl && (!menu.image_url || menu.image_url === '')) {
        const { error: updateError } = await supabaseAdmin
          .from('menus')
          .update({ image_url: imageUrl })
          .eq('id', menu.id);

        if (updateError) {
          console.error(`  ❌ Erreur pour ${menu.nom}:`, updateError.message);
        } else {
          console.log(`  ✅ ${menu.nom} - Image ajoutée`);
          updated++;
        }
      } else if (menuImages[menu.nom]) {
        // Image déjà présente, on la met à jour quand même
        const { error: updateError } = await supabaseAdmin
          .from('menus')
          .update({ image_url: menuImages[menu.nom] })
          .eq('id', menu.id);

        if (!updateError) {
          console.log(`  ✅ ${menu.nom} - Image mise à jour`);
          updated++;
        }
      } else {
        console.log(`  ⏭️  ${menu.nom} - Pas d'image configurée`);
      }
    }

    console.log(`\n✅ ${updated} menus mis à jour avec des images !\n`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();


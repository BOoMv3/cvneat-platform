#!/usr/bin/env node

/**
 * Script pour créer le menu complet de Molokai avec +25% sur tous les prix
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

const RESTAURANT_NAME = 'Molokai';

// Fonction pour ajouter 25% au prix et arrondir à 2 décimales
const addMargin = (price) => Math.round((price * 1.25) * 100) / 100;

// Configuration des menus basés sur les images fournies
const menuItems = [
  // ========== SIGNATURES X6 ==========
  {
    nom: "Dragon Mango",
    description: "Signature x6",
    prix: addMargin(11.90), // 11.90€ -> 14.88€
    category: "Signatures x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "L'Avocado Tempura",
    description: "Signature x6",
    prix: addMargin(11.50), // 11.50€ -> 14.38€
    category: "Signatures x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Signature Tiger",
    description: "Signature x6",
    prix: addMargin(10.90), // 10.90€ -> 13.63€
    category: "Signatures x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Signature Rainbow",
    description: "Signature x6",
    prix: addMargin(11.90), // 11.90€ -> 14.88€
    category: "Signatures x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },

  // ========== SUSHI NIGIRI X2 ==========
  {
    nom: "Sushi Saumon",
    description: "Boulette de riz vinaigrée agrémentée d'une fine tranche de saumon - Nigiri x2",
    prix: addMargin(4.20), // 4.20€ -> 5.25€
    category: "Sushi Nigiri x2",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Sushi Saumon Cheese",
    description: "Boulette de riz vinaigrée agrémentée d'une fine tranche de saumon et fromage - Nigiri x2",
    prix: addMargin(4.50), // 4.50€ -> 5.63€
    category: "Sushi Nigiri x2",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Sushi Saumon Tataki Teriyaki",
    description: "Boulette de riz vinaigrée agrémentée d'une fine tranche de saumon tataki teriyaki - Nigiri x2",
    prix: addMargin(5.20), // 5.20€ -> 6.50€
    category: "Sushi Nigiri x2",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Sushi Thon",
    description: "Boulette de riz vinaigrée agrémentée d'une fine tranche de thon - Nigiri x2",
    prix: addMargin(4.90), // 4.90€ -> 6.13€
    category: "Sushi Nigiri x2",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Sushi Crevette",
    description: "Boulette de riz vinaigrée agrémentée d'une crevette - Nigiri x2",
    prix: addMargin(4.90), // 4.90€ -> 6.13€
    category: "Sushi Nigiri x2",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },

  // ========== SPRING ROLLS X6 ==========
  {
    nom: "Spring Roll Saumon Avocat",
    description: "Rouleau de riz vinaigré enroulé de sa feuille de riz salade - x6",
    prix: addMargin(6.30), // 6.30€ -> 7.88€
    category: "Spring Rolls x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Spring Roll Saumon Cheese",
    description: "Rouleau de riz vinaigré enroulé de sa feuille de riz salade - x6",
    prix: addMargin(6.50), // 6.50€ -> 8.13€
    category: "Spring Rolls x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Spring Roll Thon Avocat",
    description: "Rouleau de riz vinaigré enroulé de sa feuille de riz salade - x6",
    prix: addMargin(6.70), // 6.70€ -> 8.38€
    category: "Spring Rolls x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Spring Roll Crevette Avocat",
    description: "Rouleau de riz vinaigré enroulé de sa feuille de riz salade - x6",
    prix: addMargin(6.70), // 6.70€ -> 8.38€
    category: "Spring Rolls x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Spring Roll Crevette Tempura Avocat",
    description: "Rouleau de riz vinaigré enroulé de sa feuille de riz salade - x6",
    prix: addMargin(7.20), // 7.20€ -> 9.00€
    category: "Spring Rolls x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Spring Roll Avocat Concombre Carotte",
    description: "Rouleau de riz vinaigré enroulé de sa feuille de riz salade - Veggie - x6",
    prix: addMargin(5.90), // 5.90€ -> 7.38€
    category: "Spring Rolls x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Spring Roll Thon Cuit Mayo Avocat",
    description: "Rouleau de riz vinaigré enroulé de sa feuille de riz salade - x6",
    prix: addMargin(6.50), // Prix approximatif basé sur d'autres spring rolls avec thon cuit
    category: "Spring Rolls x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },

  // ========== SALMON ABURI ROLLS X6 ==========
  {
    nom: "Salmon Roll Saumon Aburi",
    description: "Rouleau de riz vinaigré enroulé de saumon - x6",
    prix: addMargin(7.20), // 7.20€ -> 9.00€
    category: "Salmon Aburi Rolls x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Salmon Roll Tataki/Cheese",
    description: "Rouleau de riz vinaigré enroulé de saumon - x6",
    prix: addMargin(7.10), // 7.10€ -> 8.88€
    category: "Salmon Aburi Rolls x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Salmon Roll Avocat/Cheese",
    description: "Rouleau de riz vinaigré enroulé de saumon - x6",
    prix: addMargin(10.00), // 10.00€ -> 12.50€
    category: "Salmon Aburi Rolls x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },

  // ========== ACCOMPAGNEMENTS ==========
  {
    nom: "Riz Vinaigré",
    description: "Accompagnement",
    prix: addMargin(3.20), // 3.20€ -> 4.00€
    category: "Accompagnements",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Salade de Choux",
    description: "Accompagnement",
    prix: addMargin(3.20), // 3.20€ -> 4.00€
    category: "Accompagnements",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Salade Edamame",
    description: "Accompagnement",
    prix: addMargin(3.90), // 3.90€ -> 4.88€
    category: "Accompagnements",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Wakamé",
    description: "Accompagnement",
    prix: addMargin(4.90), // 4.90€ -> 6.13€
    category: "Accompagnements",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },

  // ========== MAKIS X6 ==========
  {
    nom: "Maki Saumon",
    description: "Rouleau de riz enroulé de sa feuille de nori - x6",
    prix: addMargin(4.90), // 4.90€ -> 6.13€
    category: "Makis x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Maki Saumon Cheese",
    description: "Rouleau de riz enroulé de sa feuille de nori - x6",
    prix: addMargin(5.20), // 5.20€ -> 6.50€
    category: "Makis x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Maki Thon",
    description: "Rouleau de riz enroulé de sa feuille de nori - x6",
    prix: addMargin(5.50), // 5.50€ -> 6.88€
    category: "Makis x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Maki Thon Cuit Mayo",
    description: "Rouleau de riz enroulé de sa feuille de nori - x6",
    prix: addMargin(5.30), // 5.30€ -> 6.63€
    category: "Makis x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Maki Avocat Cheese",
    description: "Rouleau de riz enroulé de sa feuille de nori - Veggie - x6",
    prix: addMargin(4.30), // 4.30€ -> 5.38€
    category: "Makis x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Maki Avocat",
    description: "Rouleau de riz enroulé de sa feuille de nori - Veggie - x6",
    prix: addMargin(3.90), // 3.90€ -> 4.88€
    category: "Makis x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Maki Cheese",
    description: "Rouleau de riz enroulé de sa feuille de nori - Veggie - x6",
    prix: addMargin(3.90), // 3.90€ -> 4.88€
    category: "Makis x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },

  // ========== CALIFORNIA X6 ==========
  {
    nom: "California Saumon Avocat",
    description: "Réinterprétation du maki inversé, saupoudré de graines de sésame - x6",
    prix: addMargin(6.20), // 6.20€ -> 7.75€
    category: "California x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "California Saumon Concombre",
    description: "Réinterprétation du maki inversé, saupoudré de graines de sésame - x6",
    prix: addMargin(6.20), // 6.20€ -> 7.75€
    category: "California x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "California Saumon Cheese",
    description: "Réinterprétation du maki inversé, saupoudré de graines de sésame - x6",
    prix: addMargin(6.20), // 6.20€ -> 7.75€
    category: "California x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "California Saumon Avocat Cheese",
    description: "Réinterprétation du maki inversé, saupoudré de graines de sésame - x6",
    prix: addMargin(6.90), // 6.90€ -> 8.63€
    category: "California x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "California Thon Avocat",
    description: "Réinterprétation du maki inversé, saupoudré de graines de sésame - x6",
    prix: addMargin(6.90), // 6.90€ -> 8.63€
    category: "California x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "California Thon Cuit Mayo Avocat",
    description: "Réinterprétation du maki inversé, saupoudré de graines de sésame - x6",
    prix: addMargin(6.50), // 6.50€ -> 8.13€
    category: "California x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "California Crevette Tempura Avocat",
    description: "Réinterprétation du maki inversé, saupoudré de graines de sésame - x6",
    prix: addMargin(7.20), // 7.20€ -> 9.00€
    category: "California x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "California Poulet Crispy Mayo Spicy",
    description: "Réinterprétation du maki inversé, saupoudré de graines de sésame - x6",
    prix: addMargin(6.50), // 6.50€ -> 8.13€
    category: "California x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "California Avocat Cheese Concombre",
    description: "Réinterprétation du maki inversé, saupoudré de graines de sésame - Veggie - x6",
    prix: addMargin(5.90), // 5.90€ -> 7.38€
    category: "California x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },

  // ========== LES CRISPY X6 ==========
  {
    nom: "Crispy Saumon Cheese",
    description: "Crispy x6",
    prix: addMargin(6.90), // 6.90€ -> 8.63€
    category: "Les Crispy x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Crispy Poulet Crispy Cheese",
    description: "Crispy x6",
    prix: addMargin(6.90), // 6.90€ -> 8.63€
    category: "Les Crispy x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Crispy Thon Cuit Mayo Avocat",
    description: "Crispy x6",
    prix: addMargin(6.90), // 6.90€ -> 8.63€
    category: "Les Crispy x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Crispy Crevette Tempura Concombre",
    description: "Crispy x6",
    prix: addMargin(7.20), // 7.20€ -> 9.00€
    category: "Les Crispy x6",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
  },

  // ========== BOISSONS ==========
  {
    nom: "Evian 50cl",
    description: "Eau minérale",
    prix: addMargin(2.00), // 2.00€ -> 2.50€
    category: "Boissons",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(2.00),
    image_url: 'https://images.unsplash.com/photo-1548839140-5a6d3c6863dc?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Coca 33cl",
    description: "Canette",
    prix: addMargin(2.00), // 2.00€ -> 2.50€
    category: "Boissons",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(2.00),
    image_url: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Coca Zéro 33cl",
    description: "Canette",
    prix: addMargin(2.00), // 2.00€ -> 2.50€
    category: "Boissons",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(2.00),
    image_url: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Coca Cherry 33cl",
    description: "Canette",
    prix: addMargin(2.00), // 2.00€ -> 2.50€
    category: "Boissons",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(2.00),
    image_url: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Ice Tea Pêche 33cl",
    description: "Canette",
    prix: addMargin(2.00), // 2.00€ -> 2.50€
    category: "Boissons",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(2.00),
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Oasis Tropical 33cl",
    description: "Canette",
    prix: addMargin(2.00), // 2.00€ -> 2.50€
    category: "Boissons",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(2.00),
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Fuze Tea 33cl",
    description: "Canette",
    prix: addMargin(2.00), // 2.00€ -> 2.50€
    category: "Boissons",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(2.00),
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Fanta Mangue Dragon 33cl",
    description: "Canette",
    prix: addMargin(2.00), // 2.00€ -> 2.50€
    category: "Boissons",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(2.00),
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Hawaï 33cl",
    description: "Canette",
    prix: addMargin(2.00), // 2.00€ -> 2.50€
    category: "Boissons",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(2.00),
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },

  // ========== LA SÉLECTION (Boissons spéciales) ==========
  {
    nom: "Ramune 20cl",
    description: "Boisson japonaise",
    prix: addMargin(3.50), // 3.50€ -> 4.38€
    category: "La Sélection",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(3.50),
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Mogu Mogu 32cl",
    description: "Litchi, cassis, mangue",
    prix: addMargin(3.00), // 3.00€ -> 3.75€
    category: "La Sélection",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(3.00),
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Mangajo Baie d'Acai & Thé Vert 35cl",
    description: "Boisson japonaise",
    prix: addMargin(3.60), // 3.60€ -> 4.50€
    category: "La Sélection",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(3.60),
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Mangajo Baie de Goji & Thé Vert 35cl",
    description: "Boisson japonaise",
    prix: addMargin(3.60), // 3.60€ -> 4.50€
    category: "La Sélection",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(3.60),
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Mangajo Citron & Thé Vert Yuzu & Citron 35cl",
    description: "Boisson japonaise",
    prix: addMargin(3.60), // 3.60€ -> 4.50€
    category: "La Sélection",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(3.60),
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },
  {
    nom: "Mangajo Grenade & Thé Vert 35cl",
    description: "Boisson japonaise",
    prix: addMargin(3.60), // 3.60€ -> 4.50€
    category: "La Sélection",
    disponible: true,
    is_drink: true,
    drink_price_small: addMargin(3.60),
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=80'
  },

  // ========== DESSERTS ==========
  {
    nom: "California Kinder Bueno Nutella",
    description: "Dessert",
    prix: addMargin(5.30), // 5.30€ -> 6.63€
    category: "Desserts",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Maki Nutella Banane Coco",
    description: "Dessert",
    prix: addMargin(5.60), // 5.60€ -> 7.00€
    category: "Desserts",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Salade de Fruits",
    description: "Dessert",
    prix: addMargin(4.90), // 4.90€ -> 6.13€
    category: "Desserts",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Mochi Glacé (1 pièce)",
    description: "Dessert",
    prix: addMargin(2.50), // 2.50€ -> 3.13€
    category: "Desserts",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1579113800032-c38bd7635818?auto=format&fit=crop&w=800&q=80'
  },
  {
    nom: "Tiramisu",
    description: "Dessert",
    prix: addMargin(4.90), // 4.90€ -> 6.13€
    category: "Desserts",
    disponible: true,
    image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80'
  }
];

async function main() {
  try {
    console.log('🔍 Recherche du restaurant Molokai...\n');

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

    // 2. Supprimer tous les menus actuels (s'il y en a)
    console.log('🗑️  Suppression des menus actuels...');
    const { error: deleteError } = await supabaseAdmin
      .from('menus')
      .delete()
      .eq('restaurant_id', restaurant.id);

    if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 = no rows deleted
      throw new Error(`Erreur suppression menus: ${deleteError.message}`);
    }
    console.log('✅ Menus actuels supprimés\n');

    // 3. Créer tous les menus
    console.log('📝 Création des nouveaux menus...\n');
    let created = 0;
    let errors = 0;

    for (const menuItem of menuItems) {
      const menuData = {
        restaurant_id: restaurant.id,
        nom: menuItem.nom,
        description: menuItem.description || '',
        prix: menuItem.prix,
        category: menuItem.category,
        disponible: menuItem.disponible !== false,
        is_drink: menuItem.is_drink || false
      };

      if (menuItem.image_url) {
        menuData.image_url = menuItem.image_url;
      }

      if (menuItem.is_drink && menuItem.drink_price_small) {
        menuData.drink_price_small = menuItem.drink_price_small;
      }

      const { data: createdMenu, error: menuError } = await supabaseAdmin
        .from('menus')
        .insert([menuData])
        .select()
        .single();

      if (menuError) {
        console.error(`  ❌ Erreur création ${menuItem.nom}:`, menuError.message);
        errors++;
      } else {
        console.log(`  ✅ ${menuItem.nom} créé (${menuItem.prix.toFixed(2)}€)`);
        created++;
      }
    }

    console.log(`\n✅ ${created} menus créés avec succès !`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} erreurs`);
    }
    console.log(`\n📊 Résumé:`);
    console.log(`   - +25% ajouté sur tous les prix`);
    console.log(`   - ${menuItems.length} items au total\n`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

main();


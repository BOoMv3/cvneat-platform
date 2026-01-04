#!/usr/bin/env node

/**
 * Script pour calculer les bénéfices CVN'EAT pour ce soir (aujourd'hui)
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Usage: node scripts/calcul-benefices-ce-soir.js
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

// Fonction pour normaliser le nom du restaurant
const normalizeName = (value = '') => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

async function calculerBenefices() {
  try {
    // Obtenir la date d'aujourd'hui en UTC (pour comparaison avec created_at)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    console.log('📊 Calcul des bénéfices CVN\'EAT pour aujourd\'hui...\n');
    console.log(`📅 Date: ${todayStart.toLocaleDateString('fr-FR')}`);
    console.log(`🕐 De: ${todayStart.toISOString()}`);
    console.log(`🕐 À: ${todayEnd.toISOString()}\n`);

    // Récupérer toutes les commandes livrées d'aujourd'hui
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select(`
        id,
        total,
        frais_livraison,
        statut,
        created_at,
        restaurant_id,
        restaurants:restaurant_id (
          id,
          nom,
          commission_rate
        )
      `)
      .eq('statut', 'livree')
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', todayEnd.toISOString());

    if (ordersError) {
      console.error('❌ Erreur lors de la récupération des commandes:', ordersError);
      process.exit(1);
    }

    if (!orders || orders.length === 0) {
      console.log('📭 Aucune commande livrée aujourd\'hui.\n');
      console.log('💰 Bénéfices CVN\'EAT: 0€');
      return;
    }

    console.log(`📦 ${orders.length} commande(s) livrée(s) aujourd\'hui\n`);

    let totalBenefices = 0;
    const beneficesParRestaurant = {};

    orders.forEach(order => {
      const restaurant = order.restaurants;
      const restaurantName = restaurant?.nom || 'Restaurant inconnu';
      const normalizedName = normalizeName(restaurantName);
      
      // Déterminer le taux de commission
      let commissionRate = parseFloat(restaurant?.commission_rate || 20) / 100;
      
      // Règle spéciale pour La Bonne Pâte (0%)
      if (normalizedName.includes('bonne pate') || normalizedName.includes('bonne pâte')) {
        commissionRate = 0;
      }
      
      // Règle spéciale pour All'ovale (15%)
      if (normalizedName.includes('all') && normalizedName.includes('ovale')) {
        commissionRate = 0.15;
      }

      const orderTotal = parseFloat(order.total || 0);
      const benefice = orderTotal * commissionRate;

      totalBenefices += benefice;

      // Grouper par restaurant
      if (!beneficesParRestaurant[restaurantName]) {
        beneficesParRestaurant[restaurantName] = {
          nom: restaurantName,
          commissionRate: commissionRate * 100,
          commandes: 0,
          totalCommandes: 0,
          benefice: 0
        };
      }

      beneficesParRestaurant[restaurantName].commandes += 1;
      beneficesParRestaurant[restaurantName].totalCommandes += orderTotal;
      beneficesParRestaurant[restaurantName].benefice += benefice;
    });

    // Afficher le détail par restaurant
    console.log('📊 Détail par restaurant:\n');
    Object.values(beneficesParRestaurant)
      .sort((a, b) => b.benefice - a.benefice)
      .forEach(resto => {
        console.log(`   ${resto.nom}`);
        console.log(`   ├─ Commission: ${resto.commissionRate}%`);
        console.log(`   ├─ Commandes: ${resto.commandes}`);
        console.log(`   ├─ CA total: ${resto.totalCommandes.toFixed(2)}€`);
        console.log(`   └─ Bénéfice CVN'EAT: ${resto.benefice.toFixed(2)}€\n`);
      });

    console.log('═'.repeat(50));
    console.log(`💰 TOTAL BÉNÉFICES CVN'EAT AUJOURD'HUI: ${totalBenefices.toFixed(2)}€`);
    console.log('═'.repeat(50));
    console.log(`\n📦 Total commandes: ${orders.length}`);
    console.log(`💵 CA total: ${orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0).toFixed(2)}€`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

calculerBenefices();


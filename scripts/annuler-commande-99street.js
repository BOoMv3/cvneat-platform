#!/usr/bin/env node

/**
 * Script pour annuler et rembourser la commande en attente du "99 Street Food"
 * NÉCESSITE: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et ADMIN_TOKEN dans .env.local
 * Usage: node scripts/annuler-commande-99street.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminToken = process.env.ADMIN_TOKEN;
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function annulerCommande99Street() {
  try {
    console.log('🔍 Recherche du restaurant "99 Street Food"...\n');

    // Trouver le restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .ilike('nom', '%99%street%food%')
      .single();

    if (restaurantError || !restaurant) {
      console.error('❌ Restaurant "99 Street Food" non trouvé.');
      process.exit(1);
    }

    console.log(`✅ Restaurant trouvé: ${restaurant.nom} (ID: ${restaurant.id})\n`);

    // Trouver les commandes en attente pour ce restaurant
    const { data: commandes, error: commandesError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, total, payment_status, stripe_payment_intent_id, created_at')
      .eq('restaurant_id', restaurant.id)
      .eq('statut', 'en_attente');

    if (commandesError) {
      console.error('❌ Erreur lors de la recherche des commandes:', commandesError);
      process.exit(1);
    }

    if (!commandes || commandes.length === 0) {
      console.log('ℹ️  Aucune commande en attente trouvée pour ce restaurant.');
      process.exit(0);
    }

    console.log(`📋 ${commandes.length} commande(s) en attente trouvée(s):\n`);

    if (!adminToken) {
      console.error('❌ ADMIN_TOKEN manquant. Impossible d\'annuler les commandes avec remboursement.');
      console.error('   Les commandes suivantes doivent être annulées manuellement:');
      commandes.forEach(cmd => {
        console.log(`   - Commande ${cmd.id}: ${cmd.total}€ (Payment Intent: ${cmd.stripe_payment_intent_id || 'N/A'})`);
      });
      process.exit(1);
    }

    // Annuler chaque commande avec remboursement
    for (const commande of commandes) {
      console.log(`🔄 Annulation de la commande ${commande.id} (${commande.total}€)...`);

      try {
        const response = await fetch(`${baseUrl}/api/admin/orders/cancel/${commande.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refund: true
          })
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(`❌ Erreur lors de l'annulation: ${data.error || data.message || 'Erreur inconnue'}`);
          continue;
        }

        console.log(`✅ Commande ${commande.id} annulée et remboursée avec succès !`);
        if (data.refund_id) {
          console.log(`   Remboursement Stripe ID: ${data.refund_id}`);
        }
        console.log('');

      } catch (error) {
        console.error(`❌ Erreur lors de l'appel API pour la commande ${commande.id}:`, error.message);
      }
    }

    console.log('✅ Opération terminée !');

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    process.exit(1);
  }
}

annulerCommande99Street();


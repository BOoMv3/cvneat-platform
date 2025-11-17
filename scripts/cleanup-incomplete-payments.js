#!/usr/bin/env node

/**
 * Script pour nettoyer les PaymentIntents Stripe incomplets
 * Les paiements "incomplets" sont normaux - ils sont créés mais jamais confirmés par le client
 * Ce script annule les PaymentIntents incomplets de plus de 24h
 */

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Charger les variables d'environnement
const envPath = join(process.cwd(), '.env.local');
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((lineRaw) => {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (!key || valueParts.length === 0) return;
    const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !SUPABASE_URL) SUPABASE_URL = value;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = value;
    if (key === 'STRIPE_SECRET_KEY' && !STRIPE_SECRET_KEY) STRIPE_SECRET_KEY = value;
  });
}

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY manquant');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function cleanupIncompletePayments() {
  try {
    console.log('🔍 Recherche des PaymentIntents incomplets de plus de 24h...\n');
    
    // Récupérer les PaymentIntents incomplets créés il y a plus de 24h
    const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
    
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      created: { lte: oneDayAgo },
    });

    console.log(`📊 ${paymentIntents.data.length} PaymentIntents trouvés\n`);

    const incompleteStatuses = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'];
    const incompletePayments = paymentIntents.data.filter(pi => 
      incompleteStatuses.includes(pi.status)
    );

    console.log(`⚠️ ${incompletePayments.length} PaymentIntents incomplets à nettoyer\n`);

    let canceled = 0;
    let errors = 0;

    for (const paymentIntent of incompletePayments) {
      try {
        // Annuler le PaymentIntent
        await stripe.paymentIntents.cancel(paymentIntent.id);
        canceled++;
        console.log(`✅ PaymentIntent ${paymentIntent.id.slice(0, 20)}... annulé (${paymentIntent.amount / 100}€)`);
      } catch (error) {
        errors++;
        console.error(`❌ Erreur annulation ${paymentIntent.id.slice(0, 20)}...:`, error.message);
      }
    }

    console.log(`\n✅ Nettoyage terminé:`);
    console.log(`   - ${canceled} PaymentIntents annulés`);
    console.log(`   - ${errors} erreurs`);
    console.log(`\n💡 Note: Les paiements "incomplets" sont normaux. Ils sont créés quand un client`);
    console.log(`   commence un paiement mais ne le complète pas. Ce script nettoie ceux de plus de 24h.`);

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
    process.exit(1);
  }
}

cleanupIncompletePayments().catch((err) => {
  console.error('Erreur:', err);
  process.exit(1);
});




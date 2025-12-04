#!/usr/bin/env node
/**
 * Script pour vérifier et corriger le total d'une commande
 * Usage: node scripts/check-order-total.js <order_id>
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrderTotal(orderId) {
  console.log(`🔍 Vérification de la commande ${orderId}...\n`);

  // Récupérer la commande
  const { data: order, error: orderError } = await supabase
    .from('commandes')
    .select('id, total, frais_livraison, created_at')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.error('❌ Erreur récupération commande:', orderError);
    return;
  }

  console.log(`📦 Commande trouvée:`);
  console.log(`   - Total stocké: ${order.total}€`);
  console.log(`   - Frais livraison: ${order.frais_livraison}€`);
  console.log(`   - Date: ${order.created_at}\n`);

  // Récupérer tous les détails
  const { data: details, error: detailsError } = await supabase
    .from('details_commande')
    .select(`
      id,
      plat_id,
      quantite,
      prix_unitaire,
      supplements,
      customizations,
      menus (
        id,
        nom,
        prix
      )
    `)
    .eq('commande_id', orderId);

  if (detailsError) {
    console.error('❌ Erreur récupération détails:', detailsError);
    return;
  }

  console.log(`📋 Détails de la commande (${details.length} items):\n`);

  let calculatedTotal = 0;
  details.forEach((detail, index) => {
    const prixUnitaire = parseFloat(detail.prix_unitaire || 0);
    const quantite = parseFloat(detail.quantite || 1);
    const totalItem = prixUnitaire * quantite;
    calculatedTotal += totalItem;

    console.log(`${index + 1}. ${detail.menus?.nom || 'Article inconnu'}`);
    console.log(`   - Prix unitaire: ${prixUnitaire}€`);
    console.log(`   - Quantité: ${quantite}`);
    console.log(`   - Total item: ${totalItem}€`);
    
    if (detail.supplements) {
      let supplements = [];
      if (typeof detail.supplements === 'string') {
        try {
          supplements = JSON.parse(detail.supplements);
        } catch {}
      } else if (Array.isArray(detail.supplements)) {
        supplements = detail.supplements;
      }
      if (supplements.length > 0) {
        console.log(`   - Suppléments: ${supplements.map(s => `${s.nom || s.name} (+${s.prix || s.price}€)`).join(', ')}`);
      }
    }
    
    if (detail.customizations) {
      let customizations = {};
      if (typeof detail.customizations === 'string') {
        try {
          customizations = JSON.parse(detail.customizations);
        } catch {}
      } else {
        customizations = detail.customizations;
      }
      if (customizations.is_menu_drink || customizations.is_formula_drink) {
        console.log(`   - 🥤 Boisson (${customizations.menu_name || customizations.formula_name || ''})`);
      }
    }
    
    console.log('');
  });

  console.log(`\n💰 RÉSUMÉ:`);
  console.log(`   - Total calculé depuis détails: ${calculatedTotal.toFixed(2)}€`);
  console.log(`   - Total stocké dans commande: ${order.total}€`);
  console.log(`   - Différence: ${(calculatedTotal - parseFloat(order.total || 0)).toFixed(2)}€`);

  if (Math.abs(calculatedTotal - parseFloat(order.total || 0)) > 0.01) {
    console.log(`\n⚠️  Les totaux ne correspondent pas !`);
    console.log(`\n🔧 Voulez-vous corriger le total dans la base de données ?`);
    console.log(`   Commande ID: ${orderId}`);
    console.log(`   Nouveau total: ${calculatedTotal.toFixed(2)}€`);
    
    // Pour corriger automatiquement, décommentez les lignes suivantes :
    /*
    const { error: updateError } = await supabase
      .from('commandes')
      .update({ total: calculatedTotal })
      .eq('id', orderId);
    
    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError);
    } else {
      console.log('✅ Total corrigé dans la base de données !');
    }
    */
  } else {
    console.log(`\n✅ Les totaux correspondent !`);
  }
}

// Récupérer l'ID de la commande depuis les arguments
const orderId = process.argv[2];

if (!orderId) {
  console.error('❌ Usage: node scripts/check-order-total.js <order_id>');
  console.error('   Exemple: node scripts/check-order-total.js d9c670f2-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
  process.exit(1);
}

checkOrderTotal(orderId).then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});


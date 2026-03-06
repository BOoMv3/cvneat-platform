#!/usr/bin/env node
/**
 * Inspecte la commande Deliss King #237eda92 (tacos à 22€+) pour expliquer le détail des prix.
 * Usage: node scripts/inspect-order-deliss-237eda92.js
 * Ou:    node scripts/inspect-order-deliss-237eda92.js <order_id>
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const ORDER_ID = process.argv[2] || '237eda92-6e8c-4afd-894c-b6053801d86b';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('🔍 Inspection commande', ORDER_ID, '\n');

  const { data: order, error: orderError } = await supabase
    .from('commandes')
    .select('id, total, frais_livraison, discount_amount, created_at, restaurant_id, adresse_livraison')
    .eq('id', ORDER_ID)
    .single();

  if (orderError || !order) {
    console.error('❌ Commande introuvable:', orderError?.message || 'Aucune donnée');
    process.exit(1);
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, nom')
    .eq('id', order.restaurant_id)
    .single();

  console.log('📦 Commande:', order.id?.slice(0, 8) || ORDER_ID.slice(0, 8));
  console.log('   Restaurant:', restaurant?.nom || order.restaurant_id);
  console.log('   Total (articles) stocké:', order.total, '€');
  console.log('   Réduction:', parseFloat(order.discount_amount || 0) || 0, '€');
  console.log('   Frais livraison:', order.frais_livraison, '€');
  console.log('   Date:', order.created_at);
  console.log('');

  const { data: details, error: detailsError } = await supabase
    .from('details_commande')
    .select('id, plat_id, quantite, prix_unitaire, supplements, customizations, menus(id, nom, prix)')
    .eq('commande_id', ORDER_ID)
    .order('id', { ascending: true });

  if (detailsError || !details?.length) {
    console.log('⚠️ Aucun détail trouvé (details_commande). Total commande =', order.total, '€');
    process.exit(0);
  }

  let subtotal = 0;
  console.log('📋 Détail des lignes:\n');

  details.forEach((d, i) => {
    const qty = parseFloat(d.quantite || 1);
    const pu = parseFloat(d.prix_unitaire || 0);
    const lineTotal = pu * qty;
    subtotal += lineTotal;

    let name = d.menus?.nom || 'Article';
    const cust = typeof d.customizations === 'string' ? (() => { try { return JSON.parse(d.customizations); } catch { return {}; } })() : (d.customizations || {});
    if (cust.combo?.comboName) name = cust.combo.comboName + ' (combo)';

    console.log(`${i + 1}. ${name}`);
    console.log(`   Prix unitaire enregistré: ${pu}€  ×  ${qty}  =  ${lineTotal.toFixed(2)}€`);

    // Suppléments stockés sur la ligne
    let sups = [];
    if (Array.isArray(d.supplements)) sups = d.supplements;
    else if (typeof d.supplements === 'string') try { sups = JSON.parse(d.supplements) || []; } catch {}
    if (sups.length) {
      console.log(`   Suppléments (déjà inclus dans prix_unitaire):`);
      sups.forEach(s => {
        const p = parseFloat(s.prix != null ? s.prix : s.price) || 0;
        console.log(`      - ${s.nom || s.name}: +${p.toFixed(2)}€`);
      });
    }

    // Combo: viandes / sauces (affichage seulement; déjà dans prix_unitaire)
    if (cust.combo?.details?.length) {
      console.log(`   Options combo (déjà incluses dans prix_unitaire):`);
      cust.combo.details.forEach(c => {
        const opt = (parseFloat(c.optionPrice || 0) + parseFloat(c.variantPrice || 0)).toFixed(2);
        console.log(`      - ${c.stepTitle || 'Option'}: ${c.optionName || '-'} (+${opt}€)`);
      });
    }

    if (pu > 15) {
      console.log(`   ⚠️ Ligne > 15€ — vérifier en admin que les options du combo (viandes/sauces) utilisent des suppléments raisonnables et pas un "prix menu" entier (linked_menu_prix).`);
    }
    console.log('');
  });

  console.log('────────────────────────────────────');
  console.log(`Sous-total calculé (détails): ${subtotal.toFixed(2)}€`);
  console.log(`Total stocké (commandes.total): ${parseFloat(order.total || 0).toFixed(2)}€`);
  console.log('');

  if (Math.abs(subtotal - parseFloat(order.total || 0)) > 0.02) {
    console.log('⚠️ Écart entre sous-total et total stocké. Vérifier la cohérence.');
  }

  console.log('💡 Explication possible pour un tacos à 22€+:');
  console.log('   - Prix base du combo (prix_base) + chaque option (viande, sauce, etc.).');
  console.log('   - Si une option a "Prix menu lié" (linked_menu_prix) = prix d’un plat entier (ex. 10€), ça s’ajoute au base → total très élevé.');
  console.log('   - À vérifier dans Admin > Restaurants > Deliss King > Combos / Étapes: utiliser "Prix supplémentaire" (ex. 1–3€) plutôt qu’un "Prix menu lié" élevé pour les viandes/sauces.');
  console.log('');
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

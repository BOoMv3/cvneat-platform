/**
 * Diagnostic commande #807abb80-3edc-4e1d-a619-0f90167164aa (La Bonne Pâte)
 * Pour comprendre pourquoi les prix étaient erronés (17€ Margherita au lieu de 13€, etc.)
 *
 * Usage: node scripts/diagnostic-order-807abb80.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  try {
    const env = readFileSync(envPath, 'utf8');
    env.split('\n').forEach((line) => {
      const [k, ...v] = line.trim().split('=');
      if (k && v.length) {
        const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
        if (k === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = val;
        if (k === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_KEY = val;
      }
    });
  } catch (_) {}
}

const ORDER_ID = '807abb80-3edc-4e1d-a619-0f90167164aa';

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('\n=== DIAGNOSTIC COMMANDE', ORDER_ID, '===\n');

  // 1) Commande
  const { data: order, error: orderErr } = await supabase
    .from('commandes')
    .select('id, created_at, total, frais_livraison, restaurant_id, payment_status, total_paid')
    .eq('id', ORDER_ID)
    .single();

  if (orderErr || !order) {
    console.error('❌ Commande introuvable:', orderErr?.message || 'Non trouvée');
    process.exit(1);
  }

  console.log('📋 Commande:');
  console.log('   total:', order.total, '€');
  console.log('   frais_livraison:', order.frais_livraison, '€');
  console.log('   total_paid:', order.total_paid, '€');
  console.log('   restaurant_id:', order.restaurant_id);

  // 2) Restaurant
  const { data: resto } = await supabase
    .from('restaurants')
    .select('id, nom')
    .eq('id', order.restaurant_id)
    .single();

  console.log('\n🍕 Restaurant:', resto?.nom || order.restaurant_id);

  // 3) Détails (lignes)
  const { data: details, error: detailsErr } = await supabase
    .from('details_commande')
    .select('id, plat_id, quantite, prix_unitaire, supplements, customizations, menus(id, nom, prix)')
    .eq('commande_id', ORDER_ID);

  if (detailsErr) {
    console.error('❌ Erreur details_commande:', detailsErr.message);
    process.exit(1);
  }

  console.log('\n📦 Lignes de commande (stockées en BDD):');
  let subtotalCalc = 0;
  for (const d of details || []) {
    const pu = parseFloat(d.prix_unitaire || 0);
    const qty = parseInt(d.quantite || 1, 10);
    const lineTotal = pu * qty;
    subtotalCalc += lineTotal;
    const menuNom = d.menus?.nom || '?';
    const menuPrixActuel = d.menus?.prix;
    console.log(`   - ${menuNom} x${qty}`);
    console.log(`     prix_unitaire stocké: ${pu}€ (total ligne: ${lineTotal.toFixed(2)}€)`);
    if (d.supplements && (Array.isArray(d.supplements) ? d.supplements.length : Object.keys(d.supplements || {}).length)) {
      console.log(`     supplements:`, JSON.stringify(d.supplements));
    }
    if (d.customizations && Object.keys(d.customizations || {}).length) {
      console.log(`     customizations:`, JSON.stringify(d.customizations));
    }
    console.log(`     menus.prix actuel (BDD): ${menuPrixActuel}€`);
    console.log('');
  }

  console.log('   Sous-total calculé depuis details_commande:', subtotalCalc.toFixed(2), '€');
  console.log('   order.total (BDD):', order.total, '€');

  // 4) Comparer avec les prix MENUS actuels pour ce restaurant
  const platIds = (details || []).map((d) => d.plat_id).filter(Boolean);
  if (platIds.length > 0) {
    const { data: menusActuels } = await supabase
      .from('menus')
      .select('id, nom, prix, supplements')
      .eq('restaurant_id', order.restaurant_id)
      .in('id', platIds);

    console.log('\n📊 Prix actuels dans menus (pour comparaison):');
    for (const m of menusActuels || []) {
      const detail = (details || []).find((d) => d.plat_id === m.id);
      const puStocke = detail ? parseFloat(detail.prix_unitaire || 0) : 0;
      const prixBase = parseFloat(m.prix || 0);
      const diff = puStocke - prixBase;
      console.log(`   ${m.nom}: menus.prix=${prixBase}€ | prix_unitaire commande=${puStocke}€ | écart=${diff > 0 ? '+' : ''}${diff.toFixed(2)}€`);
      if (m.supplements && Array.isArray(m.supplements) && m.supplements.length) {
        const jambon = m.supplements.find((s) => (s?.nom || '').toLowerCase().includes('jambon'));
        if (jambon) console.log(`     → supplément jambon: ${jambon.prix ?? jambon.prix_supplementaire ?? '?'}€`);
      }
    }
  }

  console.log('\n=== FIN DIAGNOSTIC ===\n');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Recalcule period_start / period_end et régénère invoice_html pour chaque virement restaurant.
 * Chaque facture ne contient que les commandes couvertes par CE virement (allocation chronologique).
 *
 * Usage: node scripts/regenerate-restaurant-transfer-invoices.mjs [--dry-run]
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  computeCommissionAndPayout,
  getEffectiveCommissionRatePercent,
  getFixedCommissionRatePercentFromName,
} from '../lib/commission.js';
import { buildRestaurantTransferInvoiceHtml } from '../lib/restaurant-invoice.js';

dotenv.config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const TOLERANCE = 0.05;

function is99StreetFood(nom) {
  const n = (nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return n.includes('99 street') || n.includes('99street') || n.includes('99 street food');
}

function orderPayout(order, restaurant) {
  const stored = order?.restaurant_payout;
  if (stored != null && stored !== '' && !Number.isNaN(parseFloat(stored))) {
    return round2(parseFloat(stored));
  }
  const total = parseFloat(order?.total || 0) || 0;
  const discount = parseFloat(order?.discount_amount || 0) || 0;
  const subtotal = Math.max(0, round2(total - discount));
  const subsidy = parseFloat(order?.loyalty_article_subsidy_eur || 0) || 0;
  const fixed = getFixedCommissionRatePercentFromName(restaurant?.nom);
  if (fixed === 0) return round2(subtotal + subsidy);

  const storedCommission = order?.commission_amount;
  if (storedCommission != null && storedCommission !== '' && !Number.isNaN(parseFloat(storedCommission))) {
    return round2(subtotal - parseFloat(storedCommission) + subsidy);
  }

  const ratePercent = getEffectiveCommissionRatePercent({
    restaurantName: restaurant?.nom,
    orderRatePercent: order?.commission_rate,
    restaurantRatePercent: restaurant?.commission_rate,
  });
  return round2(computeCommissionAndPayout(subtotal, ratePercent).payout + subsidy);
}

function orderCommission(order, restaurant) {
  const stored = order?.commission_amount;
  if (stored != null && stored !== '' && !Number.isNaN(parseFloat(stored))) {
    return round2(parseFloat(stored));
  }
  const total = parseFloat(order?.total || 0) || 0;
  const discount = parseFloat(order?.discount_amount || 0) || 0;
  const subtotal = Math.max(0, round2(total - discount));
  const fixed = getFixedCommissionRatePercentFromName(restaurant?.nom);
  if (fixed === 0) return 0;
  const ratePercent = getEffectiveCommissionRatePercent({
    restaurantName: restaurant?.nom,
    orderRatePercent: order?.commission_rate,
    restaurantRatePercent: restaurant?.commission_rate,
  });
  return computeCommissionAndPayout(subtotal, ratePercent).commission;
}

function toParisDate(iso) {
  return new Date(iso).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
}

function assignOrdersForTransfer(orders, startIdx, targetAmount) {
  let sum = 0;
  const picked = [];
  let idx = startIdx;

  while (idx < orders.length) {
    const o = orders[idx];
    const payout = orderPayout(o, o._restaurant);
    if (picked.length === 0 || sum + payout <= targetAmount + TOLERANCE) {
      picked.push(o);
      sum += payout;
      idx += 1;
      if (sum >= targetAmount - TOLERANCE) break;
    } else {
      break;
    }
  }

  if (picked.length === 0 && startIdx < orders.length) {
    picked.push(orders[startIdx]);
    sum = orderPayout(orders[startIdx], orders[startIdx]._restaurant);
    idx = startIdx + 1;
  }

  return { picked, nextIdx: idx, sum: round2(sum) };
}

let excluded = new Set();
try {
  const { data: excl } = await sb.from('commandes_payout_exclude').select('commande_id');
  for (const r of excl || []) {
    const id = (r.commande_id || '').toLowerCase();
    if (id) excluded.add(id);
  }
} catch {
  // table optionnelle
}

const { data: restaurants } = await sb.from('restaurants').select('id, nom, legal_name, siret, vat_number, adresse, code_postal, ville, email, commission_rate');
const restaurantById = Object.fromEntries((restaurants || []).map((r) => [r.id, r]));

const { data: transfers, error: trErr } = await sb
  .from('restaurant_transfers')
  .select('*')
  .eq('status', 'completed')
  .order('transfer_date', { ascending: true })
  .order('created_at', { ascending: true });
if (trErr) throw trErr;

const byRestaurant = {};
for (const t of transfers || []) {
  if (!byRestaurant[t.restaurant_id]) byRestaurant[t.restaurant_id] = [];
  byRestaurant[t.restaurant_id].push(t);
}

const results = [];
const issues = [];

for (const [restaurantId, restTransfers] of Object.entries(byRestaurant)) {
  const restaurant = restaurantById[restaurantId];
  if (!restaurant) continue;

  const { data: ordersRaw } = await sb
    .from('commandes')
    .select(
      'id, created_at, total, discount_amount, payment_status, user_id, commission_rate, commission_amount, restaurant_payout, loyalty_article_subsidy_eur'
    )
    .eq('restaurant_id', restaurantId)
    .eq('statut', 'livree')
    .order('created_at', { ascending: true });

  let paid = (ordersRaw || []).filter((o) => {
    const ps = (o.payment_status || '').toLowerCase();
    return !['failed', 'cancelled', 'refunded'].includes(ps) && !excluded.has((o.id || '').toLowerCase());
  });

  if (is99StreetFood(restaurant.nom)) {
    const DEBUT = new Date('2026-03-05T23:00:00.000Z');
    // Garder commandes avant mars pour virements historiques, mais filtrer pour allocation après mars
    paid = paid.map((o) => ({ ...o, _restaurant: restaurant }));
    const seen = new Set();
    paid = paid.filter((o) => {
      if (new Date(o.created_at) < DEBUT) return true;
      const key = `${toParisDate(o.created_at)}|${Number(o.total) || 0}|${(o.user_id || '').toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } else {
    paid = paid.map((o) => ({ ...o, _restaurant: restaurant }));
  }

  let orderIdx = 0;

  for (const transfer of restTransfers) {
    const target = parseFloat(transfer.amount || 0);

    const { picked, nextIdx, sum } = assignOrdersForTransfer(paid, orderIdx, target);
    orderIdx = nextIdx;

    const periodStart = picked.length ? toParisDate(picked[0].created_at) : null;
    const periodEnd = picked.length ? toParisDate(picked[picked.length - 1].created_at) : null;

    const totals = picked.reduce(
      (acc, o) => {
        acc.totalRevenue += parseFloat(o.total || 0) || 0;
        acc.totalCommission += orderCommission(o, restaurant);
        acc.totalPayoutDue += orderPayout(o, restaurant);
        return acc;
      },
      { totalRevenue: 0, totalCommission: 0, totalPayoutDue: 0 }
    );
    totals.totalRevenue = round2(totals.totalRevenue);
    totals.totalCommission = round2(totals.totalCommission);
    totals.totalPayoutDue = round2(totals.totalPayoutDue);

    const delta = round2(Math.abs(sum - target));
    if (delta > 1) {
      issues.push({
        restaurant: restaurant.nom,
        transferDate: transfer.transfer_date,
        amount: target,
        ordersSum: sum,
        delta,
        orders: picked.length,
        id: transfer.id,
      });
    }

    const invoiceNumber =
      transfer.invoice_number ||
      `FAC-${new Date(transfer.transfer_date).getFullYear()}-${(transfer.id || '').slice(0, 6).toUpperCase()}`;

    const transferForInvoice = {
      ...transfer,
      period_start: periodStart,
      period_end: periodEnd,
    };

    const invoiceHtml = buildRestaurantTransferInvoiceHtml({
      restaurant,
      transfer: transferForInvoice,
      orders: picked,
      totals,
      invoiceNumber,
    });

    results.push({
      id: transfer.id,
      restaurant: restaurant.nom?.trim(),
      transferDate: transfer.transfer_date,
      amount: target,
      orders: picked.length,
      sum,
      periodStart,
      periodEnd,
      invoiceNumber,
    });

    if (!DRY_RUN) {
      const { error } = await sb
        .from('restaurant_transfers')
        .update({
          period_start: periodStart,
          period_end: periodEnd,
          invoice_number: invoiceNumber,
          invoice_generated_at: new Date().toISOString(),
          invoice_html: invoiceHtml,
        })
        .eq('id', transfer.id);
      if (error) {
        issues.push({ restaurant: restaurant.nom, error: error.message, id: transfer.id });
      }
    }
  }
}

console.log(DRY_RUN ? '=== DRY RUN ===' : '=== FACTURES REGENEREES ===');
console.log(`Virements traités: ${results.length}`);
for (const r of results) {
  console.log(
    `${r.restaurant} | ${r.transferDate} | ${r.amount}€ | ${r.orders} cmd | somme ${r.sum}€ | ${r.periodStart} → ${r.periodEnd}`
  );
}
if (issues.length) {
  console.log('\n⚠️ Écarts > 1€ ou erreurs:');
  for (const i of issues) console.log(JSON.stringify(i));
}

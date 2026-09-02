#!/usr/bin/env node
/**
 * Recalcule et régénère toutes les factures de virements restaurants.
 * Assigne les commandes sans double-comptage (par resto, chronologique),
 * aligne le total sur le montant viré, et persiste invoice_order_ids.
 *
 * Usage:
 *   node scripts/regenerate-restaurant-transfer-invoices.mjs --dry-run
 *   node scripts/regenerate-restaurant-transfer-invoices.mjs
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { buildRestaurantTransferInvoiceHtml } from '../lib/restaurant-invoice.js';
import {
  alignOrdersPayoutToTransferAmount,
  computeTransferOrderTotals,
  parseTransferNotes,
  periodFromOrders,
  selectOrdersForTransferAmount,
  serializeTransferNotes,
} from '../lib/restaurant-transfer-orders.js';

dotenv.config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sumPayouts(orders, restaurant) {
  return round2(computeTransferOrderTotals(orders, restaurant).totalPayoutDue);
}

function acceptPaidAtWindow(sum, target) {
  const delta = Math.abs(sum - target);
  if (delta <= 5) return true;
  if (target > 0 && delta / target <= 0.03) return true;
  if (target >= sum && delta <= Math.max(60, target * 0.2)) return true;
  return false;
}

const { data: restaurants, error: rErr } = await sb
  .from('restaurants')
  .select('id, nom, legal_name, siret, vat_number, adresse, code_postal, ville, email, commission_rate')
  .order('nom');
if (rErr) throw rErr;

const { data: allTransfers, error: tErr } = await sb
  .from('restaurant_transfers')
  .select('*')
  .eq('status', 'completed')
  .order('transfer_date', { ascending: true })
  .order('created_at', { ascending: true });
if (tErr) throw tErr;

const issues = [];
let updated = 0;

for (const restaurant of restaurants || []) {
  const transfers = (allTransfers || []).filter((t) => t.restaurant_id === restaurant.id);
  if (!transfers.length) continue;

  const { data: ordersRaw, error: oErr } = await sb
    .from('commandes')
    .select(
      'id, created_at, total, discount_amount, payment_status, commission_rate, commission_amount, restaurant_payout, loyalty_article_subsidy_eur, restaurant_paid_at'
    )
    .eq('restaurant_id', restaurant.id)
    .eq('statut', 'livree')
    .order('created_at', { ascending: true });
  if (oErr) throw oErr;

  const paidOrders = (ordersRaw || [])
    .filter((o) => !['failed', 'cancelled', 'refunded'].includes((o.payment_status || '').toLowerCase()))
    .map((o) => ({ ...o, _restaurant: restaurant }));

  const usedIds = new Set();

  for (const transfer of transfers) {
    const target = parseFloat(transfer.amount || 0);
    const available = paidOrders.filter((o) => !usedIds.has(o.id));
    let orders = [];
    let mode = 'none';
    const { orderIds: persistedIds, text: existingNote } = parseTransferNotes(transfer.notes);

    // 1) IDs déjà persistés (re-run idempotent) — seulement s'ils ne sont pas déjà pris
    if (persistedIds?.length) {
      const byId = new Map(paidOrders.map((o) => [o.id, o]));
      const picked = persistedIds.map((id) => byId.get(id)).filter((o) => o && !usedIds.has(o.id));
      if (picked.length) {
        orders = picked;
        mode = 'persisted_ids';
      }
    }

    // 2) Fenêtre restaurant_paid_at
    if (!orders.length) {
      const anchorIso = transfer.created_at || transfer.invoice_generated_at;
      if (anchorIso) {
        const anchorMs = new Date(anchorIso).getTime();
        const nearPaid = available.filter((o) => {
          if (!o.restaurant_paid_at) return false;
          return Math.abs(new Date(o.restaurant_paid_at).getTime() - anchorMs) <= 15 * 60 * 1000;
        });
        if (nearPaid.length) {
          const sum = sumPayouts(nearPaid, restaurant);
          if (acceptPaidAtWindow(sum, target)) {
            if (sum > target + 5) {
              const subset = selectOrdersForTransferAmount(nearPaid, 0, target);
              orders = subset.orders.length ? subset.orders : nearPaid;
              mode = 'paid_at_window_subset';
            } else {
              orders = nearPaid;
              mode = 'paid_at_window';
            }
          }
        }
      }
    }

    // 3) Meilleur préfixe chronologique sur le pool restant
    if (!orders.length) {
      const selected = selectOrdersForTransferAmount(available, 0, target);
      orders = selected.orders;
      mode = 'chronological_remaining';
    }

    // Si toujours vide mais il reste des commandes, prendre au moins la suivante
    if (!orders.length && available.length) {
      orders = [available[0]];
      mode = 'fallback_one';
    }

    const naturalSum = sumPayouts(orders, restaurant);
    const aligned = alignOrdersPayoutToTransferAmount(orders, restaurant, target);
    const totals = computeTransferOrderTotals(aligned, restaurant);
    const period = periodFromOrders(aligned);
    const invoiceNumber =
      transfer.invoice_number ||
      `FAC-${new Date(transfer.transfer_date).getFullYear()}-${(transfer.id || '').slice(0, 6).toUpperCase()}`;

    // Préserver la note humaine (hors JSON)
    let noteText = existingNote;
    if (!noteText && transfer.notes && !String(transfer.notes).trim().startsWith('{')) {
      noteText = String(transfer.notes).trim();
    }

    const transferForInvoice = {
      ...transfer,
      period_start: period.period_start,
      period_end: period.period_end,
      notes: noteText,
    };

    const html = buildRestaurantTransferInvoiceHtml({
      restaurant,
      transfer: transferForInvoice,
      orders: aligned,
      totals,
      invoiceNumber,
    });

    const delta = round2(Math.abs((totals.totalPayoutDue || 0) - target));
    const naturalDelta = round2(naturalSum - target);

    console.log(
      `${restaurant.nom} | ${transfer.transfer_date} | ${invoiceNumber} | viré ${target}€ | facture ${totals.totalPayoutDue}€ | nat ${naturalSum}€ (Δnat ${naturalDelta}) | ${aligned.length} cmd | ${mode}`
    );

    if (delta > 0.02) {
      issues.push({
        restaurant: restaurant.nom,
        date: transfer.transfer_date,
        amount: target,
        invoice: totals.totalPayoutDue,
        delta,
        mode,
      });
    }

    for (const o of aligned) usedIds.add(o.id);

    if (!DRY_RUN) {
      const notesPayload = serializeTransferNotes({
        orderIds: aligned.map((o) => o.id),
        text: noteText,
      });
      const { error } = await sb
        .from('restaurant_transfers')
        .update({
          period_start: period.period_start,
          period_end: period.period_end,
          invoice_number: invoiceNumber,
          invoice_generated_at: new Date().toISOString(),
          invoice_html: html,
          notes: notesPayload,
        })
        .eq('id', transfer.id);
      if (error) {
        issues.push({ id: transfer.id, error: error.message });
      } else {
        updated += 1;
      }
    }
  }
}

console.log(DRY_RUN ? '\n=== DRY RUN ===' : `\n=== FACTURES REGENEREES (${updated}) ===`);
if (issues.length) {
  console.log('\nÉcarts restants / erreurs:');
  for (const i of issues) console.log(JSON.stringify(i));
} else {
  console.log('Tous les totaux facture = montants virés.');
}

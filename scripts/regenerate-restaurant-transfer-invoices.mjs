#!/usr/bin/env node
/**
 * Recalcule period_start / period_end et régénère invoice_html pour chaque virement restaurant.
 * Usage: node scripts/regenerate-restaurant-transfer-invoices.mjs [--dry-run]
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { loadRestaurantTransferInvoiceData } from '../lib/restaurant-transfer-invoice-data.js';

dotenv.config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const { data: transfers, error: trErr } = await sb
  .from('restaurant_transfers')
  .select('id, restaurant_name, amount, transfer_date, notes')
  .eq('status', 'completed')
  .order('transfer_date', { ascending: true })
  .order('created_at', { ascending: true });
if (trErr) throw trErr;

const issues = [];

for (const row of transfers || []) {
  const data = await loadRestaurantTransferInvoiceData(sb, row.id);
  if (data.error) {
    issues.push({ id: row.id, error: data.error });
    continue;
  }

  const delta = round2(Math.abs((data.totals?.totalPayoutDue || 0) - parseFloat(row.amount || 0)));
  const cleanNotes =
    row.notes && !String(row.notes).trim().startsWith('{') ? row.notes : null;

  console.log(
    `${(row.restaurant_name || '').trim()} | ${row.transfer_date} | virement ${row.amount}€ | facture ${data.totals.totalPayoutDue}€ | ${data.orders.length} cmd | écart ${delta}€`
  );

  if (delta > 1) {
    issues.push({
      restaurant: row.restaurant_name,
      transferDate: row.transfer_date,
      amount: row.amount,
      invoiceSum: data.totals.totalPayoutDue,
      delta,
    });
  }

  if (!DRY_RUN) {
    const { error } = await sb
      .from('restaurant_transfers')
      .update({
        period_start: data.transfer.period_start,
        period_end: data.transfer.period_end,
        invoice_number: data.invoiceNumber,
        invoice_generated_at: new Date().toISOString(),
        invoice_html: data.html,
        notes: cleanNotes,
      })
      .eq('id', row.id);
    if (error) issues.push({ id: row.id, error: error.message });
  }
}

console.log(DRY_RUN ? '\n=== DRY RUN ===' : '\n=== FACTURES REGENEREES ===');
if (issues.length) {
  console.log('\nÉcarts > 1€ ou erreurs:');
  for (const i of issues) console.log(JSON.stringify(i));
}

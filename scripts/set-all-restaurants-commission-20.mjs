/**
 * Met tous les restaurants à commission_rate = 20 (sauf override manuel explicite si --only).
 * Usage:
 *   node scripts/set-all-restaurants-commission-20.mjs
 *   node scripts/set-all-restaurants-commission-20.mjs --dry-run
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const dryRun = process.argv.includes('--dry-run');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: restaurants, error } = await sb
  .from('restaurants')
  .select('id, nom, commission_rate')
  .order('nom');

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Restaurants: ${restaurants.length}`);
for (const r of restaurants) {
  const rate = r.commission_rate == null ? '(null)' : r.commission_rate;
  const needs = Number(r.commission_rate) !== 20;
  console.log(`  ${needs ? '→' : ' '} ${r.nom} : ${rate}%`);
}

const toUpdate = restaurants.filter((r) => Number(r.commission_rate) !== 20);
if (toUpdate.length === 0) {
  console.log('Tous déjà à 20 %.');
  process.exit(0);
}

if (dryRun) {
  console.log(`[dry-run] ${toUpdate.length} restaurant(s) à passer à 20 %.`);
  process.exit(0);
}

const { error: upErr } = await sb
  .from('restaurants')
  .update({ commission_rate: 20 })
  .in(
    'id',
    toUpdate.map((r) => r.id)
  );

if (upErr) {
  console.error(upErr);
  process.exit(1);
}

console.log(`✅ ${toUpdate.length} restaurant(s) passés à 20 % HT.`);

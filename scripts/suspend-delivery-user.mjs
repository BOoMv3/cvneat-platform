/**
 * Bannissement temporaire + pénalité pour un livreur.
 * Fonctionne même sans colonnes DB (stockage Auth app_metadata + ban_duration).
 *
 * Usage:
 *   node scripts/suspend-delivery-user.mjs --email=dorian.ledluz@gmail.com --days=14 --penalty=30
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');

function loadEnv() {
  const out = { ...process.env };
  try {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!out[k]) out[k] = v;
    }
  } catch {
    /* ignore */
  }
  return out;
}

function arg(name, fallback = null) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = (arg('email') || '').toLowerCase().trim();
const days = Math.max(1, parseInt(arg('days', '14'), 10) || 14);
const penalty = Math.max(0, parseFloat(arg('penalty', '30')) || 0);
const reason =
  arg('reason') ||
  'En raison de plusieurs plaintes sur le site, un bannissement et une pénalité automatique ont été mis en place.';

if (!email) {
  console.error('Usage: node scripts/suspend-delivery-user.mjs --email=... [--days=14] [--penalty=30]');
  process.exit(1);
}

async function main() {
  const { data: user, error } = await sb
    .from('users')
    .select('id, prenom, nom, email, role')
    .eq('email', email)
    .maybeSingle();

  if (error || !user) {
    console.error('❌ Utilisateur introuvable:', email, error?.message);
    process.exit(1);
  }

  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const untilIso = until.toISOString();
  const banHours = Math.ceil(days * 24);

  console.log(`Suspendre ${user.prenom} ${user.nom} (${user.email})`);
  console.log(`Jusqu'au ${untilIso} (${days} jours) — pénalité ${penalty.toFixed(2)} €`);

  // 1) Ban Auth + motif dans app_metadata (source de vérité immédiate)
  const { data: authBefore } = await sb.auth.admin.getUserById(user.id);
  const prevMeta = authBefore?.user?.app_metadata || {};
  const { error: banErr } = await sb.auth.admin.updateUserById(user.id, {
    ban_duration: `${banHours}h`,
    app_metadata: {
      ...prevMeta,
      suspended_until: untilIso,
      suspension_reason: reason,
      suspension_penalty_eur: penalty,
    },
  });

  if (banErr) {
    console.error('❌ Ban Auth:', banErr.message);
    process.exit(1);
  }
  console.log(`🔒 Ban Auth actif ${banHours}h`);

  // 2) Colonnes users si la migration est appliquée (best-effort)
  const { error: updErr } = await sb
    .from('users')
    .update({
      suspended_until: untilIso,
      suspension_reason: reason,
      suspension_penalty_eur: penalty,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updErr) {
    console.warn('⚠️ Colonnes users non mises à jour (migration absente ?) :', updErr.message);
  } else {
    console.log('✅ Colonnes users mises à jour');
  }

  // 3) Pénalité sur gains à encaisser
  if (penalty > 0) {
    const { data: stats } = await sb
      .from('delivery_stats')
      .select('id, total_earnings')
      .eq('delivery_id', user.id)
      .maybeSingle();

    if (stats) {
      const current = Number(stats.total_earnings || 0);
      const next = Math.max(0, Math.round((current - penalty) * 100) / 100);
      await sb.from('delivery_stats').update({ total_earnings: next }).eq('id', stats.id);
      console.log(`💸 Gains: ${current.toFixed(2)} € → ${next.toFixed(2)} €`);
    } else {
      console.log('💸 Pas de ligne delivery_stats — aucune déduction de gains');
    }
  }

  try {
    await sb.auth.admin.signOut(user.id, 'global');
    console.log('🚪 Sessions invalidées');
  } catch (e) {
    console.warn('⚠️ signOut global:', e?.message || e);
  }

  console.log('✅ Suspension appliquée pour Dorian Bié /', email);
}

main().catch((e) => {
  console.error('❌', e.message || e);
  process.exit(1);
});

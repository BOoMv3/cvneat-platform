/**
 * Lève la suspension / ban Auth d’un utilisateur (ex. livreur).
 *
 * Usage:
 *   node scripts/unsuspend-delivery-user.mjs --email=logan@cvneat.fr
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
if (!email) {
  console.error('Usage: node scripts/unsuspend-delivery-user.mjs --email=...');
  process.exit(1);
}

async function main() {
  const { data: user, error } = await sb
    .from('users')
    .select('id, prenom, nom, email, role')
    .eq('email', email)
    .maybeSingle();

  if (error || !user) {
    // Fallback : chercher par prénom/nom si email exact introuvable
    const { data: byName } = await sb
      .from('users')
      .select('id, prenom, nom, email, role')
      .or(`prenom.ilike.%${email.split('@')[0]}%,nom.ilike.%${email.split('@')[0]}%,email.ilike.%${email}%`)
      .limit(10);
    console.error('❌ Utilisateur introuvable:', email, error?.message);
    if (byName?.length) {
      console.log('Correspondances possibles:', byName);
    }
    process.exit(1);
  }

  console.log(`Débannir ${user.prenom || ''} ${user.nom || ''} (${user.email}) [${user.role}]`);

  const { data: authBefore, error: authGetErr } = await sb.auth.admin.getUserById(user.id);
  if (authGetErr || !authBefore?.user) {
    console.error('❌ Auth user introuvable:', authGetErr?.message);
    process.exit(1);
  }

  const prevMeta = { ...(authBefore.user.app_metadata || {}) };

  // ban_duration: 'none' lève le ban Auth Supabase
  // Les clés metadata doivent être mises à null (merge) pour disparaître réellement.
  const { error: unbanErr } = await sb.auth.admin.updateUserById(user.id, {
    ban_duration: 'none',
    app_metadata: {
      ...prevMeta,
      suspended_until: null,
      suspension_reason: null,
      suspension_penalty_eur: null,
      suspension_type: null,
    },
  });

  if (unbanErr) {
    console.error('❌ Unban Auth:', unbanErr.message);
    process.exit(1);
  }
  console.log('🔓 Ban Auth levé (ban_duration=none) + metadata nettoyée');

  // Colonnes users (si migration appliquée)
  const { error: updErr } = await sb
    .from('users')
    .update({
      suspended_until: null,
      suspension_reason: null,
      suspension_penalty_eur: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updErr) {
    console.warn('⚠️ Colonnes users non mises à jour (souvent absentes) :', updErr.message);
  } else {
    console.log('✅ Colonnes users remises à zéro');
  }

  console.log(`✅ Compte ${user.email} débanni — reconnexion possible.`);
}

main().catch((e) => {
  console.error('❌', e.message || e);
  process.exit(1);
});

/**
 * Email d'excuse clients CVN'EAT.
 * Usage:
 *   node scripts/send-client-apology-email.mjs --dry-run
 *   node scripts/send-client-apology-email.mjs --send
 *   node scripts/send-client-apology-email.mjs --send --test=ton@email.fr
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import emailService from '../lib/emailService.js';

dotenv.config({ path: '.env.local' });

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--send');
const testArg = process.argv.find((a) => a.startsWith('--test='));
const testEmail = testArg ? testArg.split('=')[1] : null;

const SUBJECT = 'Nos excuses — ce qui se passe chez CVN’EAT en ce moment';

const HTML = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1f2937; line-height: 1.65; font-size: 16px;">
  <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #ea580c;">CVN'EAT</p>
  <h1 style="margin: 0 0 20px; font-size: 24px; line-height: 1.25; color: #111827;">On vous doit des excuses</h1>

  <p>Bonjour,</p>

  <p>
    Depuis quelque temps, trop de commandes chez CVN'EAT se passent mal :
    <strong>attente trop longue</strong>, livreur difficile à trouver, commande qui trainait,
    parfois même une annulation. Si ça vous est arrivé, on le sait — et on est
    <strong>vraiment désolés</strong>.
  </p>

  <p>
    Ce n’est pas un problème de restaurants. La plupart sont prêts et font leur job.
    Le vrai frein, ces dernières semaines, c’est le <strong>manque de livreurs disponibles</strong>
    au moment où vous commandez. Sans livreur sur la zone, on ne peut pas garantir
    le même rythme qu’une grosse app nationale.
  </p>

  <p>
    CVN'EAT, c’est une <strong>petite équipe locale</strong>. On fait tourner la plateforme
    en parallèle d’autres jobs : ce n’est pas une machine avec des dizaines de personnes
    derrière. On ne gagne pas d’argent sur le dos de CVN'EAT — on essaie surtout de
    <strong>faire vivre un service près de chez vous</strong>, avec les restos du coin.
  </p>

  <p>
    On travaille pour stabiliser les livraisons (recrutement livreurs, outils, suivi).
    Ça prendra encore un peu de temps, mais on ne lâche pas.
  </p>

  <p>
    Merci d’avoir tenu le coup avec nous. Si une commande s’est mal passée pour vous,
    écrivez-nous à
    <a href="mailto:contact@cvneat.fr" style="color: #ea580c; font-weight: 600;">contact@cvneat.fr</a>
    — on lira et on répondra.
  </p>

  <p style="margin-top: 28px;">
    Encore désolés,<br>
    <strong>L’équipe CVN'EAT</strong>
  </p>
</div>
`.trim();

const TEXT = `
On vous doit des excuses — CVN'EAT

Bonjour,

Depuis quelque temps, trop de commandes chez CVN'EAT se passent mal : attente trop longue, livreur difficile à trouver, commande qui trainait, parfois même une annulation. Si ça vous est arrivé, on le sait — et on est vraiment désolés.

Ce n’est pas un problème de restaurants. La plupart sont prêts et font leur job. Le vrai frein, ces dernières semaines, c’est le manque de livreurs disponibles au moment où vous commandez. Sans livreur sur la zone, on ne peut pas garantir le même rythme qu’une grosse app nationale.

CVN'EAT, c’est une petite équipe locale. On fait tourner la plateforme en parallèle d’autres jobs : ce n’est pas une machine avec des dizaines de personnes derrière. On ne gagne pas d’argent sur le dos de CVN'EAT — on essaie surtout de faire vivre un service près de chez vous, avec les restos du coin.

On travaille pour stabiliser les livraisons (recrutement livreurs, outils, suivi). Ça prendra encore un peu de temps, mais on ne lâche pas.

Merci d’avoir tenu le coup avec nous. Si une commande s’est mal passée pour vous, écrivez-nous à contact@cvneat.fr — on lira et on répondra.

Encore désolés,
L’équipe CVN'EAT
`.trim();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function collectEmails() {
  const emails = new Set();
  const skipRoles = new Set(['admin', 'comptable', 'partner', 'restaurant', 'delivery']);

  const isSendable = (email) => {
    const e = String(email || '').toLowerCase().trim();
    if (!e || !e.includes('@')) return false;
    if (e.endsWith('@placeholder.cvneat')) return false;
    if (e.includes('placeholder')) return false;
    if (e.endsWith('.local')) return false;
    return true;
  };

  let page = 1;
  const perPage = 1000;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    for (const u of users) {
      if (isSendable(u.email)) emails.add(u.email.toLowerCase());
    }
    hasMore = users.length === perPage;
    page += 1;
  }

  // Retirer les comptes non-clients (partenaires / livreurs / admin)
  const { data: fromTable } = await sb.from('users').select('email, role').not('email', 'is', null);
  const blocked = new Set();
  for (const u of fromTable || []) {
    const role = String(u.role || '').toLowerCase();
    if (skipRoles.has(role) && u.email) blocked.add(u.email.toLowerCase());
  }
  for (const e of blocked) emails.delete(e);

  return Array.from(emails).sort();
}

const all = testEmail ? [testEmail.toLowerCase()] : await collectEmails();
console.log(`Destinataires: ${all.length}`);
console.log('Aperçu:', all.slice(0, 8).join(', '));
console.log('Sujet:', SUBJECT);

if (dryRun) {
  console.log('\n[dry-run] Aucun email envoyé. Relance avec --send pour envoyer.');
  console.log('Test ciblé: node scripts/send-client-apology-email.mjs --send --test=toi@email.fr');
  process.exit(0);
}

const BATCH = 10;
const DELAY_MS = 2000;
let sent = 0;
const errors = [];

for (let i = 0; i < all.length; i += BATCH) {
  const batch = all.slice(i, i + BATCH);
  await Promise.all(
    batch.map(async (email) => {
      try {
        await emailService.sendEmail({
          to: email,
          subject: SUBJECT,
          html: HTML,
          text: TEXT,
        });
        sent += 1;
        console.log('✅', email);
      } catch (e) {
        errors.push({ email, error: e.message });
        console.error('❌', email, e.message);
      }
    })
  );
  if (i + BATCH < all.length) {
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
}

console.log(`\nTerminé: ${sent}/${all.length} envoyés, ${errors.length} erreurs`);
if (errors.length) console.log(errors.slice(0, 10));

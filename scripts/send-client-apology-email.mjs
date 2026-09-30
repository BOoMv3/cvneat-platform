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

const SUBJECT = 'Nos excuses — problèmes de livraison ces dernières semaines';

const HTML = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; line-height: 1.7; font-size: 16px;">
  <p style="margin: 0 0 6px; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #ea580c;">CVN'EAT</p>
  <h1 style="margin: 0 0 22px; font-size: 26px; line-height: 1.25; color: #111827;">On s’excuse — et on vous explique</h1>

  <p>Bonjour,</p>

  <p>
    Depuis plusieurs semaines, le service de livraison CVN'EAT n’est pas à la hauteur.
    Trop de commandes ont pris trop de temps, se sont retrouvées sans livreur, ou ont dû être annulées.
    Si ça vous est arrivé : <strong>on est sincèrement désolés</strong>.
  </p>

  <p>
    <strong>Ce qui se passe :</strong> le problème ne vient en général pas des restaurants.
    Ils préparent correctement. Le frein, c’est surtout le <strong>manque de livreurs disponibles</strong>
    au moment où vous commandez — surtout en soirée et le week-end. Sans livreur près de chez vous,
    on ne peut pas livrer aussi vite ni aussi régulièrement qu’on le voudrait.
  </p>

  <p>
    CVN'EAT, c’est une <strong>petite équipe locale</strong>. On fait tourner la plateforme
    en parallèle d’autres jobs. On ne gagne pas d’argent sur le dos de CVN'EAT :
    l’objectif, c’est de proposer un service utile près de chez vous, avec les restos du coin.
  </p>

  <p>
    <strong>Ce qu’on fait :</strong> on recrute et on active plus de livreurs, on améliore
    le suivi des commandes, et on travaille pour que vous soyez mieux informés quand une livraison
    risque d’être longue ou impossible. Ça ne se règle pas en un clic, mais on y travaille concrètement.
  </p>

  <p>
    Merci d’avoir patienté. Si une commande s’est mal passée pour vous, écrivez-nous à
    <a href="mailto:contact@cvneat.fr" style="color: #ea580c; font-weight: 700;">contact@cvneat.fr</a>
    avec le n° de commande — on vous répondra.
  </p>

  <p style="margin-top: 28px;">
    Encore désolés,<br>
    <strong>Tony &amp; l’équipe CVN'EAT</strong>
  </p>
</div>
`.trim();

const TEXT = `
Nos excuses — problèmes de livraison ces dernières semaines

Bonjour,

Depuis plusieurs semaines, le service de livraison CVN'EAT n’est pas à la hauteur. Trop de commandes ont pris trop de temps, se sont retrouvées sans livreur, ou ont dû être annulées. Si ça vous est arrivé : on est sincèrement désolés.

Ce qui se passe : le problème ne vient en général pas des restaurants. Ils préparent correctement. Le frein, c’est surtout le manque de livreurs disponibles au moment où vous commandez — surtout en soirée et le week-end. Sans livreur près de chez vous, on ne peut pas livrer aussi vite ni aussi régulièrement qu’on le voudrait.

CVN'EAT, c’est une petite équipe locale. On fait tourner la plateforme en parallèle d’autres jobs. On ne gagne pas d’argent sur le dos de CVN'EAT : l’objectif, c’est de proposer un service utile près de chez vous, avec les restos du coin.

Ce qu’on fait : on recrute et on active plus de livreurs, on améliore le suivi des commandes, et on travaille pour que vous soyez mieux informés quand une livraison risque d’être longue ou impossible. Ça ne se règle pas en un clic, mais on y travaille concrètement.

Merci d’avoir patienté. Si une commande s’est mal passée pour vous, écrivez-nous à contact@cvneat.fr avec le n° de commande — on vous répondra.

Encore désolés,
Tony & l’équipe CVN'EAT
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

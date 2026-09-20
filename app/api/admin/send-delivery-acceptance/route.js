import { NextResponse } from 'next/server';
import emailService from '@/lib/emailService';
import {
  buildDeliveryAcceptanceHtml,
  buildDeliveryAcceptanceText,
  DELIVERY_ACCEPTANCE_SUBJECT,
} from '@/lib/delivery-acceptance-email';

export const dynamic = 'force-dynamic';

const DEFAULT_RECIPIENTS = [
  { email: 'guillierpauline24@gmail.com', prenom: 'Pauline' },
  { email: 'ninamaheli0517@gmail.com', prenom: 'Nina' },
  { email: 'benedicte.noviant@hotmail.fr', prenom: 'Bénédicte' },
  { email: 'asdih.marwan@orange.fr', prenom: 'Marwan' },
  { email: 'lolavigier2@gmail.com', prenom: 'Lola' },
];

function authorize(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceKey || !token || token !== serviceKey) {
    return false;
  }
  return true;
}

export async function POST(request) {
  try {
    if (!authorize(request)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    let recipients = DEFAULT_RECIPIENTS;
    if (body?.email) {
      recipients = [
        {
          email: String(body.email).trim(),
          prenom: (body.prenom || '').trim() || 'Livreur',
          loginEmail: (body.loginEmail || body.email || '').trim() || null,
          password: body.password ? String(body.password) : null,
        },
      ];
    } else if (Array.isArray(body?.recipients) && body.recipients.length > 0) {
      recipients = body.recipients
        .map((r) => ({
          email: String(r.email || '').trim(),
          prenom: String(r.prenom || '').trim() || 'Livreur',
          loginEmail: (r.loginEmail || r.email || '').trim() || null,
          password: r.password ? String(r.password) : null,
        }))
        .filter((r) => r.email);
    }

    if (!recipients.length) {
      return NextResponse.json({ error: 'Aucun destinataire' }, { status: 400 });
    }

    const subject = DELIVERY_ACCEPTANCE_SUBJECT;
    const results = [];

    for (const r of recipients) {
      try {
        const creds = { loginEmail: r.loginEmail || r.email, password: r.password || null };
        const info = await emailService.sendEmail({
          to: r.email,
          subject,
          html: buildDeliveryAcceptanceHtml(r.prenom, creds),
          text: buildDeliveryAcceptanceText(r.prenom, creds),
        });
        results.push({
          email: r.email,
          ok: true,
          id: info?.messageId || null,
        });
      } catch (e) {
        results.push({ email: r.email, ok: false, error: e.message });
      }
    }

    try {
      const firstCreds = {
        loginEmail: recipients[0].loginEmail || recipients[0].email,
        password: recipients[0].password || null,
      };
      const verify = await emailService.sendEmail({
        to: 'contact@cvneat.fr',
        subject: `[COPIE VÉRIFICATION] ${subject}`,
        html:
          buildDeliveryAcceptanceHtml(recipients[0].prenom, firstCreds) +
          `<p style="padding:16px;font-size:12px;color:#6b7280;">Copie de vérification admin — emails envoyés à : ${recipients.map((x) => x.email).join(', ')}</p>`,
        text:
          buildDeliveryAcceptanceText(recipients[0].prenom, firstCreds) +
          `\n\nCopie vérification — destinataires: ${recipients.map((x) => x.email).join(', ')}`,
      });
      results.push({
        email: 'contact@cvneat.fr',
        ok: true,
        verifyCopy: true,
        id: verify?.messageId || null,
      });
    } catch (e) {
      results.push({ email: 'contact@cvneat.fr', ok: false, verifyCopy: true, error: e.message });
    }

    const allOk = results.every((r) => r.ok);
    return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 207 });
  } catch (e) {
    console.error('send-delivery-acceptance:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

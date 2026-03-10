import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function formatDateFR(isoOrDate) {
  if (!isoOrDate) return '';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatEUR(amount) {
  const n = Math.round((Number(amount) || 0) * 100) / 100;
  return `${n.toFixed(2)} €`;
}

function buildDeliveryInvoiceHtml({ issuerLines, deliveryLines, transfer, reference }) {
  const periodText =
    transfer.period_start && transfer.period_end
      ? `${formatDateFR(transfer.period_start)} → ${formatDateFR(transfer.period_end)}`
      : '—';

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Facture / Attestation de virement - Livreur</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; color:#111; margin: 24px; }
      h1 { margin: 0 0 4px 0; font-size: 20px; }
      h2 { margin: 0 0 16px 0; font-size: 13px; font-weight: 600; color:#444; }
      .grid { display:flex; gap:24px; margin-bottom: 16px; }
      .card { border:1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; flex:1; }
      .card h3 { margin:0 0 8px 0; font-size: 12px; color:#6b7280; text-transform: uppercase; letter-spacing: .04em; }
      .line { font-size: 13px; margin: 2px 0; }
      .amount-block { font-size: 18px; font-weight: 700; margin: 16px 0; }
      .meta { margin-top: 10px; font-size: 12px; color:#6b7280; }
      @media print {
        body { margin: 0; }
        .no-print { display:none; }
      }
    </style>
  </head>
  <body>
    <div class="no-print" style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:12px;">
      <button onclick="window.print()" style="padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px; background:#111; color:#fff; cursor:pointer;">Imprimer / PDF</button>
    </div>

    <h1>Facture / Attestation de virement — Livreur</h1>
    <h2>Paiement des gains de livraison</h2>

    <div class="grid">
      <div class="card">
        <h3>Émetteur (CVN'EAT)</h3>
        ${issuerLines.map((x) => `<div class="line">${x}</div>`).join('')}
      </div>
      <div class="card">
        <h3>Bénéficiaire (livreur)</h3>
        ${deliveryLines.map((x) => `<div class="line">${x}</div>`).join('')}
      </div>
    </div>

    <div class="card">
      <h3>Détails du virement</h3>
      <div class="line"><strong>Date du virement :</strong> ${formatDateFR(transfer.transfer_date)}</div>
      <div class="line"><strong>Période concernée :</strong> ${periodText}</div>
      <div class="line"><strong>Référence :</strong> ${reference || transfer.reference_number || transfer.id?.slice(0, 8) || '—'}</div>
      <div class="amount-block">Montant : ${formatEUR(transfer.amount)}</div>
      ${transfer.notes ? `<div class="meta">${transfer.notes}</div>` : ''}
    </div>

    <div class="meta" style="margin-top: 16px;">
      Document généré par CVN'EAT — Facture / attestation de virement livreur.
    </div>
  </body>
</html>`;
}

async function requireAdminUser(request) {
  const authHeader = request.headers.get('authorization');
  const token =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

  if (!token) return { ok: false, status: 401, error: 'Token requis' };

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  const user = userRes?.user;
  if (userErr || !user) return { ok: false, status: 401, error: 'Token invalide' };

  const { data: userData, error: roleErr } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (roleErr || !userData || userData.role !== 'admin') {
    return { ok: false, status: 403, error: 'Accès admin requis' };
  }

  return { ok: true, user };
}

export async function GET(request, { params }) {
  const auth = await requireAdminUser(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const { data: transfer, error: transferErr } = await supabaseAdmin
    .from('delivery_transfers')
    .select('*')
    .eq('id', id)
    .single();
  if (transferErr || !transfer) {
    return NextResponse.json({ error: 'Virement introuvable' }, { status: 404 });
  }

  const { data: driver } = await supabaseAdmin
    .from('users')
    .select('id, nom, prenom, email, adresse, code_postal, ville, siret, legal_name')
    .eq('id', transfer.delivery_id)
    .single();

  const displayName =
    driver?.legal_name ||
    `${(driver?.prenom || '').trim()} ${(driver?.nom || '').trim()}`.trim() ||
    transfer.delivery_name ||
    'Livreur';

  const deliveryLines = [
    displayName,
    driver?.siret ? `SIRET : ${driver.siret}` : null,
    transfer.delivery_email ? `Email : ${transfer.delivery_email}` : null,
    driver?.adresse || driver?.ville
      ? `${driver?.adresse || ''} ${driver?.code_postal || ''} ${driver?.ville || ''}`.trim()
      : null,
  ].filter(Boolean);

  const issuerLines = [
    "CVN'EAT (SAS)",
    'SIRET 989 966 700 00019',
    'RCS Montpellier 989 966 700',
    '1 bis Rue Armand Sabatier, 34190 Ganges, France',
    'Email : contact@cvneat.fr',
  ];

  const dateStr = formatDateFR(transfer.transfer_date).replace(/\//g, '');
  const ref = `CVNEAT-LIV-${dateStr}-${(transfer.id || '').slice(0, 6).toUpperCase()}`;

  const html = buildDeliveryInvoiceHtml({
    issuerLines,
    deliveryLines,
    transfer,
    reference: ref,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

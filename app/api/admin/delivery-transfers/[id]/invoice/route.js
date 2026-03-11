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

function formatDateTimeFR(isoOrDate) {
  if (!isoOrDate) return '';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatEUR(amount) {
  const n = Math.round((Number(amount) || 0) * 100) / 100;
  return `${n.toFixed(2)} €`;
}

function buildDeliveryInvoiceHtml({
  issuerLines,
  deliveryLines,
  transfer,
  reference,
  ordersDetail,
  ordersCount,
}) {
  const periodText =
    transfer.period_start && transfer.period_end
      ? `${formatDateFR(transfer.period_start)} au ${formatDateFR(transfer.period_end)}`
      : transfer.period_start
        ? `À partir du ${formatDateFR(transfer.period_start)}`
        : '—';

  const hasOrders = ordersDetail && ordersDetail.length > 0;
  const countDisplay = ordersCount != null ? ordersCount : (hasOrders ? ordersDetail.length : 0);

  const netLivreur = (o) =>
    parseFloat(o.frais_livraison || 0) - parseFloat(o.delivery_commission_cvneat || 0);
  const rowsHtml = hasOrders
    ? ordersDetail
        .map(
          (o) => `
        <tr>
          <td>${formatDateTimeFR(o.created_at)}</td>
          <td>${(o.id || '').slice(0, 8).toUpperCase()}</td>
          <td class="right">${formatEUR(o.frais_livraison)}</td>
          <td class="right">${formatEUR(o.delivery_commission_cvneat)}</td>
          <td class="right">${formatEUR(netLivreur(o))}</td>
        </tr>
      `
        )
        .join('')
    : '';

  const totalFrais = hasOrders
    ? ordersDetail.reduce((s, o) => s + parseFloat(o.frais_livraison || 0), 0)
    : 0;
  const totalCommission = hasOrders
    ? ordersDetail.reduce((s, o) => s + parseFloat(o.delivery_commission_cvneat || 0), 0)
    : 0;
  const totalNet = hasOrders
    ? ordersDetail.reduce(
        (s, o) =>
          s +
          (parseFloat(o.frais_livraison || 0) - parseFloat(o.delivery_commission_cvneat || 0)),
        0
      )
    : parseFloat(transfer.amount || 0);

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Facture virement livreur - ${reference || 'CVN\'EAT'}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111; margin: 0; padding: 24px; font-size: 14px; }
      .invoice { max-width: 800px; margin: 0 auto; }
      h1 { margin: 0 0 4px 0; font-size: 22px; font-weight: 700; }
      .subtitle { font-size: 13px; color: #555; margin-bottom: 24px; }
      .grid { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
      .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; flex: 1; min-width: 260px; }
      .card h3 { margin: 0 0 10px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
      .line { font-size: 13px; margin: 3px 0; line-height: 1.4; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #e5e7eb; padding: 10px 12px; font-size: 13px; text-align: left; }
      th { background: #f9fafb; color: #374151; font-weight: 600; }
      td.right, th.right { text-align: right; }
      tfoot td { font-weight: 700; background: #f9fafb; }
      .meta { margin-top: 16px; font-size: 12px; color: #6b7280; }
      .right { text-align: right; }
      .summary-block { margin: 20px 0; padding: 16px; background: #f9fafb; border-radius: 8px; }
      .summary-block .row { display: flex; justify-content: space-between; margin: 6px 0; }
      .summary-block .total { font-size: 18px; font-weight: 700; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; }
      @media print {
        html, body { padding: 16px; background: #fff !important; color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
        .card, table, th, td, tfoot td { background: #fff !important; color: #111 !important; }
      }
    </style>
  </head>
  <body style="background: #fff; color: #111;">
    <script>
      function downloadFacture() {
        var fn = document.getElementById('facture-download-name').getAttribute('data-filename');
        var h = '<!DOCTYPE html>' + document.documentElement.outerHTML;
        var blob = new Blob([h], { type: 'text/html;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fn || 'facture-livreur.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }
    </script>
    <span id="facture-download-name" data-filename="facture-livreur-${(reference || 'cvneat').replace(/[^a-zA-Z0-9-]/g, '-')}.html" style="display:none"></span>
    <div class="no-print" style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
      <button type="button" onclick="downloadFacture()" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #111; color: #fff; cursor: pointer; font-weight: 500;">Télécharger</button>
      <button type="button" onclick="window.print()" style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #374151; color: #fff; cursor: pointer;">Imprimer</button>
    </div>

    <div class="invoice">
      <h1>Facture – Paiement des gains de livraison</h1>
      <p class="subtitle">Référence : ${reference || transfer.reference_number || transfer.id?.slice(0, 8) || '—'}</p>

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
        <h3>Période et montant</h3>
        <div class="line"><strong>Période concernée :</strong> ${periodText}</div>
        <div class="line"><strong>Date du virement :</strong> ${formatDateFR(transfer.transfer_date)}</div>
        <div class="line"><strong>Nombre de courses payées :</strong> ${countDisplay}</div>
        ${transfer.notes ? `<div class="line"><strong>Note :</strong> ${transfer.notes}</div>` : ''}
      </div>

      ${
        hasOrders
          ? `
      <div class="card" style="margin-top: 16px;">
        <h3>Détail des courses</h3>
        <table>
          <thead>
            <tr>
              <th>Date / heure</th>
              <th>Réf. commande</th>
              <th class="right">Frais livraison</th>
              <th class="right">Commission CVN'EAT</th>
              <th class="right">Net livreur</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="right">Total</td>
              <td class="right">${formatEUR(totalFrais)}</td>
              <td class="right">${formatEUR(totalCommission)}</td>
              <td class="right">${formatEUR(totalNet)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      `
          : `
      <div class="card" style="margin-top: 16px;">
        <h3>Montant du virement</h3>
        <p class="line" style="font-size: 18px; font-weight: 700;">${formatEUR(transfer.amount)}</p>
      </div>
      `
      }

      <div class="meta" style="margin-top: 24px;">
        Document généré par CVN'EAT – Facture de paiement livreur. Exonération de TVA, art. 293 B du CGI.
      </div>
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

  let ordersDetail = [];
  const orderIds = transfer.order_ids || [];
  const ordersCount = transfer.orders_count ?? 0;

  if (orderIds.length > 0) {
    const { data: orders } = await supabaseAdmin
      .from('commandes')
      .select('id, created_at, frais_livraison, delivery_commission_cvneat')
      .in('id', orderIds)
      .order('created_at', { ascending: true });
    ordersDetail = orders || [];
  }

  const html = buildDeliveryInvoiceHtml({
    issuerLines,
    deliveryLines,
    transfer,
    reference: ref,
    ordersDetail,
    ordersCount,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

import { getFixedCommissionRatePercentFromName, getEffectiveCommissionRatePercent, computeCommissionAndPayout } from './commission';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function formatDateFR(isoOrDate) {
  if (!isoOrDate) return '';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatEUR(amount) {
  return `${round2(amount).toFixed(2)} €`;
}

export function buildRestaurantTransferInvoiceHtml({ restaurant, transfer, orders, totals, invoiceNumber }) {
  const fixedRatePercent = getFixedCommissionRatePercentFromName(restaurant.nom);
  const restRate = restaurant.commission_rate ?? 20;
  const rowsHtml = (orders || [])
    .map((o) => {
      const ratePercent = getEffectiveCommissionRatePercent({
        restaurantName: restaurant.nom,
        orderRatePercent: o.commission_rate,
        restaurantRatePercent: restRate,
      });
      const computed = computeCommissionAndPayout(Number(o.total || 0), ratePercent);
      const commission =
        fixedRatePercent !== null
          ? computed.commission
          : (o.commission_amount ?? computed.commission);
      const payout =
        fixedRatePercent !== null
          ? computed.payout
          : (o.restaurant_payout ?? computed.payout);
      return `
        <tr>
          <td>${formatDateFR(o.created_at)}</td>
          <td>${(o.id || '').slice(0, 8)}</td>
          <td style="text-align:right">${formatEUR(o.total || 0)}</td>
          <td style="text-align:right">${formatEUR(commission)}</td>
          <td style="text-align:right">${formatEUR(payout)}</td>
        </tr>
      `;
    })
    .join('');

  const restaurantLines = [
    restaurant.legal_name || restaurant.nom || 'Restaurant',
    restaurant.siret ? `SIRET: ${restaurant.siret}` : null,
    restaurant.vat_number ? `TVA: ${restaurant.vat_number}` : null,
    `${restaurant.adresse || ''} ${restaurant.code_postal || ''} ${restaurant.ville || ''}`.trim(),
    restaurant.email ? `Email: ${restaurant.email}` : null,
  ].filter(Boolean);

  const issuerLines = [
    "CVN'EAT (SAS)",
    'SIRET 989 966 700 00019',
    'RCS Montpellier 989 966 700',
    '1 bis Rue Armand Sabatier, 34190 Ganges, France',
    'Email: contact@cvneat.fr',
  ];

  const periodText =
    transfer.period_start && transfer.period_end
      ? `${formatDateFR(transfer.period_start)} au ${formatDateFR(transfer.period_end)}`
      : transfer.periodComputed
        ? transfer.periodComputed
        : '—';
  const ordersCount = (orders || []).length;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Facture / Relevé - ${invoiceNumber || 'Sans numéro'}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; color:#111; margin: 24px; }
      h1 { margin: 0 0 4px 0; font-size: 20px; }
      h2 { margin: 0 0 16px 0; font-size: 13px; font-weight: 600; color:#444; }
      .grid { display:flex; gap:24px; margin-bottom: 16px; flex-wrap: wrap; }
      .card { border:1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; flex:1; min-width: 260px; }
      .card h3 { margin:0 0 8px 0; font-size: 12px; color:#6b7280; text-transform: uppercase; letter-spacing: .04em; }
      .line { font-size: 13px; margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #e5e7eb; padding: 10px 8px; font-size: 12px; vertical-align: top; }
      th { text-align: left; color:#6b7280; font-weight: 600; }
      tfoot td { font-weight: 700; }
      .meta { margin-top: 10px; font-size: 12px; color:#6b7280; }
      .right { text-align: right; }
      @media print {
        html, body { margin: 0; padding: 16px; background: #fff !important; color: #111 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
        a.download = fn || 'facture.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }
    </script>
    <span id="facture-download-name" data-filename="facture-${(invoiceNumber || 'cvneat').replace(/[^a-zA-Z0-9-]/g, '-')}.html" style="display:none"></span>
    <div class="no-print" style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:12px; flex-wrap: wrap;">
      <button type="button" onclick="downloadFacture()" style="padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px; background:#111; color:#fff; cursor:pointer;">Télécharger</button>
      <button type="button" onclick="window.print()" style="padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px; background:#374151; color:#fff; cursor:pointer;">Imprimer</button>
    </div>

    <h1>Facture de commission / Relevé de paiement</h1>
    <h2>Virement enregistré — ${invoiceNumber ? `N° ${invoiceNumber}` : 'numéro en attente'}</h2>

    <div class="grid">
      <div class="card">
        <h3>Émetteur (plateforme)</h3>
        ${issuerLines.map((x) => `<div class="line">${x}</div>`).join('')}
      </div>
      <div class="card">
        <h3>Restaurant</h3>
        ${restaurantLines.map((x) => `<div class="line">${x}</div>`).join('')}
      </div>
    </div>

    <div class="card">
      <h3>Infos virement</h3>
      <div class="line"><strong>Période:</strong> ${periodText}</div>
      <div class="line"><strong>Nombre de commandes:</strong> ${ordersCount}</div>
      <div class="line"><strong>Date virement:</strong> ${formatDateFR(transfer.transfer_date)}</div>
      <div class="line"><strong>Montant viré:</strong> ${formatEUR(transfer.amount)}</div>
      <div class="line"><strong>Référence bancaire:</strong> ${transfer.reference_number || '—'}</div>
      ${transfer.notes ? `<div class="meta">${transfer.notes}</div>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Commande</th>
          <th class="right">CA (articles)</th>
          <th class="right">Commission</th>
          <th class="right">Net restaurant</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="5">Aucune commande trouvée.</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="right">Totaux</td>
          <td class="right">${formatEUR(totals.totalRevenue)}</td>
          <td class="right">${formatEUR(totals.totalCommission)}</td>
          <td class="right">${formatEUR(totals.totalPayoutDue)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="meta">
      Document généré par CVN'EAT. Exonération de TVA, art. 293 B du CGI.
    </div>
  </body>
</html>`;
}

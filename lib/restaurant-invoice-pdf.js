import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
import {
  computeTransferOrderCommissionEur,
  computeTransferOrderPayoutEur,
} from './restaurant-transfer-orders.js';
import { formatDateFR, formatEUR } from './restaurant-invoice.js';

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function sanitizeFilename(name) {
  return (name || 'facture').replace(/[^a-zA-Z0-9-_]/g, '-');
}

function drawLine(doc, y) {
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
}

function ensureSpace(doc, y, needed = 40) {
  if (y + needed > 760) {
    doc.addPage();
    return 50;
  }
  return y;
}

export function buildRestaurantTransferInvoicePdfBuffer({
  restaurant,
  transfer,
  orders,
  totals,
  invoiceNumber,
  options = {},
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const periodText =
      transfer.period_start && transfer.period_end
        ? `${formatDateFR(transfer.period_start)} au ${formatDateFR(transfer.period_end)}`
        : transfer.periodComputed || '—';

    let y = 50;

    if (options.logoBuffer) {
      try {
        doc.image(options.logoBuffer, 50, y, { height: 48 });
        y += 56;
      } catch {
        // logo optionnel
      }
    }

    if (options.sampleBanner) {
      doc.save();
      doc.roundedRect(50, y, 495, 40, 6).fill('#fef3c7');
      doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(9).text("DOCUMENT D'EXEMPLE — DONNÉES FICTIVES", 58, y + 10);
      doc.font('Helvetica').fontSize(8).text(
        'Montants, SIRET et commandes fictifs — format identique aux factures réelles CVN\'EAT.',
        58,
        y + 24,
        { width: 478 }
      );
      doc.restore();
      doc.fillColor('#000000');
      y += 50;
    }

    doc.font('Helvetica-Bold').fontSize(16).text('Facture de commission / Relevé de paiement', 50, y);
    y += 22;
    doc.font('Helvetica').fontSize(11).fillColor('#444444').text(
      `Virement enregistré — N° ${invoiceNumber || 'sans numéro'}`,
      50,
      y
    );
    doc.fillColor('#000000');
    y += 28;

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280').text('ÉMETTEUR (PLATEFORME)', 50, y);
    doc.text('RESTAURANT', 300, y);
    doc.fillColor('#000000');
    y += 14;

    const issuerLines = [
      "CVN'EAT (SAS)",
      'SIRET 989 966 700 00019',
      'RCS Montpellier 989 966 700',
      '1 bis Rue Armand Sabatier, 34190 Ganges',
      'Email: contact@cvneat.fr',
    ];
    const restaurantLines = [
      restaurant.legal_name || restaurant.nom || 'Restaurant',
      restaurant.siret ? `SIRET: ${restaurant.siret}` : null,
      restaurant.vat_number ? `TVA: ${restaurant.vat_number}` : null,
      `${restaurant.adresse || ''} ${restaurant.code_postal || ''} ${restaurant.ville || ''}`.trim(),
      restaurant.email ? `Email: ${restaurant.email}` : null,
    ].filter(Boolean);

    const blockStartY = y;
    doc.font('Helvetica').fontSize(10);
    issuerLines.forEach((line, i) => doc.text(line, 50, blockStartY + i * 13, { width: 230 }));
    restaurantLines.forEach((line, i) => doc.text(line, 300, blockStartY + i * 13, { width: 245 }));
    y = blockStartY + Math.max(issuerLines.length, restaurantLines.length) * 13 + 16;

    drawLine(doc, y);
    y += 14;
    doc.font('Helvetica-Bold').fontSize(10).text('Infos virement', 50, y);
    y += 16;
    doc.font('Helvetica').fontSize(10);
    const infoLines = [
      `Période : ${periodText}`,
      `Nombre de commandes : ${(orders || []).length}`,
      `Date virement : ${formatDateFR(transfer.transfer_date)}`,
      `Montant viré : ${formatEUR(transfer.amount)}`,
      `Référence bancaire : ${transfer.reference_number || '—'}`,
    ];
    infoLines.forEach((line) => {
      doc.text(line, 50, y);
      y += 14;
    });
    y += 8;

    const cols = {
      date: 50,
      order: 115,
      revenue: 300,
      commission: 390,
      payout: 470,
    };

    y = ensureSpace(doc, y, 60);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#6b7280');
    doc.text('Date', cols.date, y);
    doc.text('Commande', cols.order, y);
    doc.text('CA articles', cols.revenue, y, { width: 80, align: 'right' });
    doc.text('Commission', cols.commission, y, { width: 70, align: 'right' });
    doc.text('Net resto', cols.payout, y, { width: 75, align: 'right' });
    doc.fillColor('#000000');
    y += 14;
    drawLine(doc, y);
    y += 8;

    doc.font('Helvetica').fontSize(9);
    for (const order of orders || []) {
      y = ensureSpace(doc, y, 18);
      const commission = computeTransferOrderCommissionEur(order, restaurant);
      const payout = computeTransferOrderPayoutEur(order, restaurant);
      doc.text(formatDateFR(order.created_at), cols.date, y, { width: 60 });
      doc.text((order.id || '').slice(0, 8), cols.order, y, { width: 70 });
      doc.text(formatEUR(order.total || 0), cols.revenue, y, { width: 80, align: 'right' });
      doc.text(formatEUR(commission), cols.commission, y, { width: 70, align: 'right' });
      doc.text(formatEUR(payout), cols.payout, y, { width: 75, align: 'right' });
      y += 16;
    }

    if (!orders?.length) {
      doc.text('Aucune commande trouvée.', cols.date, y);
      y += 16;
    }

    y = ensureSpace(doc, y, 80);
    drawLine(doc, y);
    y += 10;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Totaux', cols.order, y);
    doc.text(formatEUR(totals.totalRevenue), cols.revenue, y, { width: 80, align: 'right' });
    doc.text(formatEUR(totals.totalCommission), cols.commission, y, { width: 70, align: 'right' });
    doc.text(formatEUR(totals.totalPayoutDue), cols.payout, y, { width: 75, align: 'right' });
    y += 24;

    doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text(
      "Document généré par CVN'EAT. Exonération de TVA, art. 293 B du CGI.",
      50,
      y,
      { width: 500 }
    );

    doc.end();
  });
}

export function invoicePdfFilename(invoiceNumber) {
  return `${sanitizeFilename(invoiceNumber || 'facture-cvneat')}.pdf`;
}

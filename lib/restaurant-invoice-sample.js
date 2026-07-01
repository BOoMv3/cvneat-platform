import { buildRestaurantTransferInvoiceHtml } from './restaurant-invoice.js';
import { buildRestaurantTransferInvoicePdfBuffer } from './restaurant-invoice-pdf.js';

export const SAMPLE_INVOICE_NUMBER = 'FAC-2026-EXEMPLE';

/** Données fictives pour présentation comptable (aucune commande réelle). */
export function buildSampleRestaurantInvoicePayload() {
  const restaurant = {
    nom: 'Restaurant Exemple',
    legal_name: 'SARL Le Bistrot du Marché',
    siret: '123 456 789 00012',
    vat_number: null,
    adresse: '12 avenue de la République',
    code_postal: '34000',
    ville: 'Montpellier',
    email: 'contact@lebistrot-exemple.fr',
    commission_rate: 20,
  };

  const orders = [
    { id: 'ex000001-0000-4000-8000-000000000001', created_at: '2026-05-02T19:30:00.000Z', total: 32.4, commission_amount: 6.48, restaurant_payout: 25.92 },
    { id: 'ex000002-0000-4000-8000-000000000002', created_at: '2026-05-04T12:15:00.000Z', total: 18.9, commission_amount: 3.78, restaurant_payout: 15.12 },
    { id: 'ex000003-0000-4000-8000-000000000003', created_at: '2026-05-08T20:05:00.000Z', total: 45.0, commission_amount: 9.0, restaurant_payout: 36.0 },
    { id: 'ex000004-0000-4000-8000-000000000004', created_at: '2026-05-12T13:40:00.000Z', total: 27.8, commission_amount: 5.56, restaurant_payout: 22.24 },
    { id: 'ex000005-0000-4000-8000-000000000005', created_at: '2026-05-18T19:55:00.000Z', total: 38.5, commission_amount: 7.7, restaurant_payout: 30.8 },
    { id: 'ex000006-0000-4000-8000-000000000006', created_at: '2026-05-24T21:10:00.000Z', total: 21.0, commission_amount: 4.2, restaurant_payout: 16.8 },
  ];

  const totals = {
    totalRevenue: 183.6,
    totalCommission: 36.72,
    totalPayoutDue: 146.88,
  };

  const transfer = {
    transfer_date: '2026-05-31',
    period_start: '2026-05-01',
    period_end: '2026-05-31',
    amount: totals.totalPayoutDue,
    reference_number: 'VIR-CVNEAT-EXEMPLE-202605',
    notes: 'Document d’exemple — commission plateforme 20 % sur le CA articles (hors frais de livraison).',
  };

  return {
    restaurant,
    transfer,
    orders,
    totals,
    invoiceNumber: SAMPLE_INVOICE_NUMBER,
  };
}

export function buildSampleRestaurantInvoiceHtml(origin = '') {
  const data = buildSampleRestaurantInvoicePayload();
  const logoSrc = origin ? `${origin.replace(/\/$/, '')}/cvneat-logo.png` : '/cvneat-logo.png';

  return buildRestaurantTransferInvoiceHtml({
    ...data,
    options: {
      sampleBanner: true,
      logoSrc,
    },
  });
}

export function buildSampleRestaurantInvoicePdfBuffer(logoBuffer = null) {
  const data = buildSampleRestaurantInvoicePayload();
  return buildRestaurantTransferInvoicePdfBuffer({
    ...data,
    options: {
      sampleBanner: true,
      logoBuffer,
    },
  });
}

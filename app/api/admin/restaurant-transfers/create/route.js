import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatEUR(amount) {
  return `${round2(amount).toFixed(2)} €`;
}

function formatDateFR(isoOrDate) {
  if (!isoOrDate) return '';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
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

function buildTransferHtml({ issuer, restaurant, transfer, orders, totals, invoiceNumber }) {
  const rowsHtml = (orders || [])
    .map((o) => {
      const rate = o.commission_rate ?? restaurant.commission_rate ?? 20;
      const commission = o.commission_amount ?? round2((Number(o.total || 0) * Number(rate || 0)) / 100);
      const payout = o.restaurant_payout ?? round2(Number(o.total || 0) - commission);
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
    `${restaurant.legal_name || restaurant.nom || 'Restaurant'}`,
    restaurant.siret ? `SIRET: ${restaurant.siret}` : null,
    restaurant.vat_number ? `TVA: ${restaurant.vat_number}` : null,
    `${restaurant.adresse || ''} ${restaurant.code_postal || ''} ${restaurant.ville || ''}`.trim(),
    restaurant.email ? `Email: ${restaurant.email}` : null,
  ].filter(Boolean);

  const issuerLines = [
    `CVN'EAT (SAS)`,
    `SIRET 989 966 700 00019`,
    `RCS Montpellier 989 966 700`,
    `1 bis Rue Armand Sabatier, 34190 Ganges, France`,
    `Email: contact@cvneat.fr`,
  ];

  const periodText =
    transfer.period_start && transfer.period_end
      ? `${formatDateFR(transfer.period_start)} → ${formatDateFR(transfer.period_end)}`
      : '—';

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
      .grid { display:flex; gap:24px; margin-bottom: 16px; }
      .card { border:1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; flex:1; }
      .card h3 { margin:0 0 8px 0; font-size: 12px; color:#6b7280; text-transform: uppercase; letter-spacing: .04em; }
      .line { font-size: 13px; margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; font-size: 12px; vertical-align: top; }
      th { text-align: left; color:#6b7280; font-weight: 600; }
      tfoot td { font-weight: 700; }
      .meta { margin-top: 10px; font-size: 12px; color:#6b7280; }
      .right { text-align: right; }
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
      <div class="line"><strong>Date virement:</strong> ${formatDateFR(transfer.transfer_date)}</div>
      <div class="line"><strong>Montant viré:</strong> ${formatEUR(transfer.amount)}</div>
      <div class="line"><strong>Référence bancaire:</strong> ${transfer.reference_number || '—'}</div>
      <div class="line"><strong>Période:</strong> ${periodText}</div>
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
        ${rowsHtml || '<tr><td colspan=\"5\">Aucune commande trouvée sur la période / non payée.</td></tr>'}
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
      Document généré par CVN'EAT. Pour une conformité totale, renseigne le SIRET/TVA du restaurant dans l'admin.
    </div>
  </body>
</html>`;
}

export async function POST(request) {
  try {
    const auth = await requireAdminUser(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const {
      restaurant_id,
      restaurant_name,
      amount,
      transfer_date,
      reference_number,
      period_start,
      period_end,
      notes,
    } = body || {};

    if (!restaurant_id || !amount || !transfer_date) {
      return NextResponse.json(
        { error: 'restaurant_id, amount, transfer_date sont requis' },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    const { data: restaurant, error: restErr } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, legal_name, siret, vat_number, adresse, code_postal, ville, email, commission_rate')
      .eq('id', restaurant_id)
      .single();
    if (restErr || !restaurant) {
      return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 });
    }

    // Enregistrer le virement
    const { data: transfer, error: transferErr } = await supabaseAdmin
      .from('restaurant_transfers')
      .insert({
        restaurant_id,
        restaurant_name: restaurant_name || restaurant.nom,
        amount: amountNum,
        transfer_date,
        reference_number: reference_number || null,
        period_start: period_start || null,
        period_end: period_end || null,
        notes: notes || null,
        status: 'completed',
        created_by: auth.user.id,
      })
      .select()
      .single();
    if (transferErr || !transfer) {
      console.error('Erreur création restaurant_transfers:', transferErr);
      return NextResponse.json({ error: 'Erreur création virement' }, { status: 500 });
    }

    // Récupérer les commandes à payer: livrées, payées, non marquées restaurant_paid_at
    let ordersQuery = supabaseAdmin
      .from('commandes')
      .select('id, created_at, total, payment_status, commission_rate, commission_amount, restaurant_payout')
      .eq('restaurant_id', restaurant_id)
      .eq('statut', 'livree')
      .is('restaurant_paid_at', null)
      .order('created_at', { ascending: true });

    if (transfer.period_start) {
      ordersQuery = ordersQuery.gte('created_at', new Date(transfer.period_start).toISOString());
    }
    if (transfer.period_end) {
      const end = new Date(transfer.period_end);
      end.setHours(23, 59, 59, 999);
      ordersQuery = ordersQuery.lte('created_at', end.toISOString());
    }

    const { data: ordersAll, error: ordersErr } = await ordersQuery;
    if (ordersErr) {
      console.error('Erreur récupération commandes pour facture:', ordersErr);
    }

    const orders = (ordersAll || []).filter((o) => !o.payment_status || o.payment_status === 'paid');

    const totals = orders.reduce(
      (acc, o) => {
        const rate = o.commission_rate ?? restaurant.commission_rate ?? 20;
        const commission = o.commission_amount ?? round2((Number(o.total || 0) * Number(rate || 0)) / 100);
        const payout = o.restaurant_payout ?? round2(Number(o.total || 0) - commission);
        acc.totalRevenue += Number(o.total || 0);
        acc.totalCommission += commission;
        acc.totalPayoutDue += payout;
        return acc;
      },
      { totalRevenue: 0, totalCommission: 0, totalPayoutDue: 0 }
    );

    // Numéro de facture (si la fonction existe)
    let invoiceNumber = null;
    try {
      const rpc = await supabaseAdmin.rpc('next_restaurant_invoice_number', {
        p_date: transfer.transfer_date,
      });
      if (!rpc.error && rpc.data) invoiceNumber = rpc.data;
    } catch {
      // ignore
    }
    if (!invoiceNumber) {
      const year = new Date(transfer.transfer_date).getFullYear();
      invoiceNumber = `FAC-${year}-${transfer.id.slice(0, 6).toUpperCase()}`;
    }

    const invoiceHtml = buildTransferHtml({
      issuer: null,
      restaurant,
      transfer,
      orders,
      totals,
      invoiceNumber,
    });

    // Tenter d'archiver sur le virement (si colonnes présentes)
    try {
      const upd = await supabaseAdmin
        .from('restaurant_transfers')
        .update({
          invoice_number: invoiceNumber,
          invoice_generated_at: new Date().toISOString(),
          invoice_html: invoiceHtml,
        })
        .eq('id', transfer.id);
      if (upd.error) {
        console.warn('Impossible d’archiver invoice_html (migration non appliquée ?):', upd.error.message);
      }
    } catch {
      // ignore
    }

    // Marquer les commandes comme payées (même logique que l'UI actuelle)
    try {
      const { error: markErr } = await supabaseAdmin
        .from('commandes')
        .update({ restaurant_paid_at: new Date().toISOString() })
        .eq('restaurant_id', restaurant_id)
        .eq('statut', 'livree')
        .is('restaurant_paid_at', null);
      if (markErr) console.warn('Erreur marquage commandes payées:', markErr.message);
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      transfer: { ...transfer, invoice_number: invoiceNumber },
      invoice_number: invoiceNumber,
      invoice_html: invoiceHtml,
      totals: {
        totalRevenue: round2(totals.totalRevenue),
        totalCommission: round2(totals.totalCommission),
        totalPayoutDue: round2(totals.totalPayoutDue),
      },
    });
  } catch (error) {
    console.error('Erreur API restaurant transfer create:', error);
    return NextResponse.json({ error: 'Erreur serveur', details: error.message }, { status: 500 });
  }
}



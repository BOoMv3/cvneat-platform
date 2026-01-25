import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getFixedCommissionRatePercentFromName, getEffectiveCommissionRatePercent, computeCommissionAndPayout } from '../../../../../lib/commission';

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

function normalizeKind(kind) {
  const k = (kind || '').toString().trim().toLowerCase();
  if (k === 'statement' || k === 'releve') return 'statement';
  return 'commission';
}

async function requireAdminUser(request) {
  const authHeader = request.headers.get('authorization');
  const token =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : null;

  if (!token) {
    return { ok: false, status: 401, error: 'Token requis' };
  }

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
  const user = userRes?.user;
  if (userErr || !user) {
    return { ok: false, status: 401, error: 'Token invalide' };
  }

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

function buildHtml({ title, subtitle, issuer, customer, lines, totals, meta }) {
  const rowsHtml = lines
    .map(
      (l) => `
        <tr>
          <td>${l.date}</td>
          <td>${l.ref}</td>
          <td style="text-align:right">${l.amount}</td>
          <td style="text-align:right">${l.commission || ''}</td>
          <td style="text-align:right">${l.payout || ''}</td>
        </tr>
      `
    )
    .join('');

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; color:#111; margin: 24px; }
      h1 { margin: 0 0 4px 0; font-size: 22px; }
      h2 { margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color:#444; }
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

    <h1>${title}</h1>
    <h2>${subtitle}</h2>

    <div class="grid">
      <div class="card">
        <h3>Émetteur</h3>
        ${issuer.lines.map((x) => `<div class="line">${x}</div>`).join('')}
      </div>
      <div class="card">
        <h3>Restaurant</h3>
        ${customer.lines.map((x) => `<div class="line">${x}</div>`).join('')}
      </div>
    </div>

    <div class="card">
      <h3>Infos</h3>
      <div class="line"><strong>Période:</strong> ${meta.period}</div>
      <div class="line"><strong>Généré le:</strong> ${meta.generatedAt}</div>
      <div class="line"><strong>Référence:</strong> ${meta.reference}</div>
      ${meta.note ? `<div class="meta">${meta.note}</div>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Commande</th>
          <th class="right">CA (articles)</th>
          <th class="right">${meta.kind === 'commission' ? 'Commission' : 'Commission'}</th>
          <th class="right">${meta.kind === 'commission' ? 'Net restaurant' : 'Net restaurant'}</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan=\"5\">Aucune donnée sur la période.</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="right">Totaux</td>
          <td class="right">${totals.total}</td>
          <td class="right">${totals.commission}</td>
          <td class="right">${totals.payout}</td>
        </tr>
      </tfoot>
    </table>

    <div class="meta">
      Document généré par CVN'EAT. (Note: pour une facture conforme, ajoute le SIRET/TVA de CVN'EAT et du restaurant si nécessaire.)
    </div>
  </body>
</html>`;
}

export async function GET(request) {
  const auth = await requireAdminUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const kind = normalizeKind(searchParams.get('kind'));

  if (!restaurantId || !start || !end) {
    return NextResponse.json(
      { error: 'Paramètres requis: restaurantId, start, end' },
      { status: 400 }
    );
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Dates invalides' }, { status: 400 });
  }

  const { data: restaurant, error: restErr } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom, adresse, code_postal, ville, email, commission_rate')
    .eq('id', restaurantId)
    .single();
  if (restErr || !restaurant) {
    return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 });
  }

  let query = supabaseAdmin
    .from('commandes')
    .select('id, created_at, total, statut, payment_status, commission_rate, commission_amount, restaurant_payout')
    .eq('restaurant_id', restaurantId)
    .eq('statut', 'livree')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  const { data: orders, error: ordersErr } = await query;
  if (ordersErr) {
    return NextResponse.json({ error: 'Erreur récupération commandes' }, { status: 500 });
  }

  const paidOrders = (orders || []).filter((o) => {
    const s = (o.payment_status || '').toString().trim().toLowerCase();
    return !['failed', 'cancelled', 'refunded'].includes(s);
  });

  // Règle fixe éventuelle (Bonne Pâte / All'ovale)
  const fixedRatePercent = getFixedCommissionRatePercentFromName(restaurant.nom);
  const restRate = restaurant.commission_rate ?? 20;
  const displayRatePercent =
    fixedRatePercent !== null
      ? fixedRatePercent
      : (Number(restRate) || 20);

  const lines = paidOrders.map((o) => {
    const ratePercent = getEffectiveCommissionRatePercent({
      restaurantName: restaurant.nom,
      orderRatePercent: o.commission_rate,
      restaurantRatePercent: restRate,
    });

    // Si on est sur une règle fixe, on recalcule toujours (ça corrige l'historique si des valeurs stockées sont incohérentes).
    // Sinon, on préfère les valeurs stockées par commande pour respecter l'historique.
    const computed = computeCommissionAndPayout(Number(o.total || 0), ratePercent);
    const commission =
      fixedRatePercent !== null
        ? computed.commission
        : (o.commission_amount ?? computed.commission);
    const payout =
      fixedRatePercent !== null
        ? computed.payout
        : (o.restaurant_payout ?? computed.payout);
    return {
      date: formatDateFR(o.created_at),
      ref: (o.id || '').slice(0, 8),
      amount: formatEUR(o.total || 0),
      commission: formatEUR(commission),
      payout: formatEUR(payout),
    };
  });

  const total = paidOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
  const commissionTotal = paidOrders.reduce((acc, o) => {
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
    return acc + commission;
  }, 0);
  const payoutTotal = paidOrders.reduce((acc, o) => {
    const ratePercent = getEffectiveCommissionRatePercent({
      restaurantName: restaurant.nom,
      orderRatePercent: o.commission_rate,
      restaurantRatePercent: restRate,
    });
    const computed = computeCommissionAndPayout(Number(o.total || 0), ratePercent);
    const payout =
      fixedRatePercent !== null
        ? computed.payout
        : (o.restaurant_payout ?? computed.payout);
    return acc + payout;
  }, 0);

  const issuer = {
    lines: [
      `CVN'EAT (SAS)`,
      `1 bis Rue Armand Sabatier, 34190 Ganges, France`,
      `SIRET 989 966 700 00019`,
      `RCS Montpellier 989 966 700`,
      `Email: contact@cvneat.fr`,
    ],
  };
  const customer = {
    lines: [
      `${restaurant.nom}`,
      `${restaurant.adresse || ''} ${restaurant.code_postal || ''} ${restaurant.ville || ''}`.trim(),
      restaurant.email ? `Email: ${restaurant.email}` : null,
      `Commission: ${Number(displayRatePercent).toFixed(2)}%`,
    ].filter(Boolean),
  };

  const ref = `CVNEAT-${kind === 'commission' ? 'COMM' : 'STAT'}-${startDate
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}-${restaurant.id.slice(0, 6)}-${Date.now().toString().slice(-6)}`;

  const html = buildHtml({
    title: kind === 'commission' ? 'Facture de commission (brouillon)' : 'Relevé de ventes (brouillon)',
    subtitle: kind === 'commission'
      ? 'Commission CVN’EAT sur les ventes (articles) — à imprimer / PDF'
      : 'Récapitulatif des commandes payées/livrées — à imprimer / PDF',
    issuer,
    customer,
    lines,
    totals: {
      total: formatEUR(total),
      commission: formatEUR(commissionTotal),
      payout: formatEUR(payoutTotal),
    },
    meta: {
      kind,
      period: `${formatDateFR(startDate)} → ${formatDateFR(endDate)}`,
      generatedAt: new Date().toLocaleString('fr-FR'),
      reference: ref,
      note:
        "Astuce: utilise le bouton « Imprimer / PDF » pour archiver une preuve comptable. Pour une facture conforme, ajoute SIRET/TVA de CVN'EAT et du restaurant.",
    },
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}



import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getFixedCommissionRatePercentFromName, getEffectiveCommissionRatePercent, computeCommissionAndPayout } from '../../../../../lib/commission';
import { buildRestaurantTransferInvoiceHtml } from '../../../../../lib/restaurant-invoice';

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

    const orders = (ordersAll || []).filter((o) => {
      const s = (o.payment_status || '').toString().trim().toLowerCase();
      return !['failed', 'cancelled', 'refunded'].includes(s);
    });

    const fixedRatePercent = getFixedCommissionRatePercentFromName(restaurant.nom);
    const restRate = restaurant.commission_rate ?? 20;
    const totals = orders.reduce(
      (acc, o) => {
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

    const invoiceHtml = buildRestaurantTransferInvoiceHtml({
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



import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildRestaurantTransferInvoiceHtml } from '../../../../../lib/restaurant-invoice';
import {
  computeTransferOrderTotals,
  periodFromOrders,
  selectOrdersForTransferAmount,
} from '../../../../../lib/restaurant-transfer-orders';

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

    // Anti double-clic / double soumission:
    // si le même admin enregistre le même montant, même resto et même date à quelques minutes d'intervalle,
    // on considère qu'il s'agit probablement d'un doublon involontaire.
    try {
      const duplicateWindowIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recentDuplicates, error: dupErr } = await supabaseAdmin
        .from('restaurant_transfers')
        .select('id, created_at, amount, transfer_date')
        .eq('restaurant_id', restaurant_id)
        .eq('created_by', auth.user.id)
        .eq('status', 'completed')
        .eq('transfer_date', transfer_date)
        .eq('amount', amountNum)
        .gte('created_at', duplicateWindowIso)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!dupErr && Array.isArray(recentDuplicates) && recentDuplicates.length > 0) {
        const duplicate = recentDuplicates[0];
        return NextResponse.json(
          {
            error:
              "Doublon détecté: un virement identique a déjà été enregistré il y a quelques minutes. Vérifiez l'historique avant de recommencer.",
            code: 'POSSIBLE_DUPLICATE_TRANSFER',
            existing_transfer_id: duplicate.id,
            existing_created_at: duplicate.created_at,
          },
          { status: 409 }
        );
      }
    } catch (dupCheckError) {
      // Ne pas bloquer le virement si la vérification anti-doublon échoue
      console.warn('Vérification anti-doublon non disponible:', dupCheckError?.message || dupCheckError);
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

    // Commandes éligibles : livrées, payées, pas encore rattachées à un virement
    const { data: ordersAll, error: ordersErr } = await supabaseAdmin
      .from('commandes')
      .select(
        'id, created_at, total, discount_amount, payment_status, commission_rate, commission_amount, restaurant_payout, loyalty_article_subsidy_eur'
      )
      .eq('restaurant_id', restaurant_id)
      .eq('statut', 'livree')
      .is('restaurant_paid_at', null)
      .order('created_at', { ascending: true });
    if (ordersErr) {
      console.error('Erreur récupération commandes pour facture:', ordersErr);
    }

    const unpaidPaid = (ordersAll || [])
      .filter((o) => {
        const s = (o.payment_status || '').toString().trim().toLowerCase();
        return !['failed', 'cancelled', 'refunded'].includes(s);
      })
      .map((o) => ({ ...o, _restaurant: restaurant }));

    const { orders, nextIdx: _nextIdx, sum: _selectedSum } = selectOrdersForTransferAmount(
      unpaidPaid,
      0,
      amountNum
    );

    const period =
      period_start && period_end
        ? { period_start, period_end }
        : periodFromOrders(orders);

    if (period.period_start || period.period_end) {
      await supabaseAdmin
        .from('restaurant_transfers')
        .update({
          period_start: period.period_start,
          period_end: period.period_end,
        })
        .eq('id', transfer.id);
      transfer.period_start = period.period_start;
      transfer.period_end = period.period_end;
    }

    const totals = computeTransferOrderTotals(orders, restaurant);

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

    // Marquer uniquement les commandes de CE virement
    try {
      const orderIds = orders.map((o) => o.id).filter(Boolean);
      if (orderIds.length > 0) {
        const { error: markErr } = await supabaseAdmin
          .from('commandes')
          .update({ restaurant_paid_at: new Date().toISOString() })
          .in('id', orderIds);
        if (markErr) console.warn('Erreur marquage commandes payées:', markErr.message);
      }
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



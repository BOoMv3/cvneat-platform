import { createClient } from '@supabase/supabase-js';
import { buildRestaurantTransferInvoiceHtml } from './restaurant-invoice';
import {
  computeTransferOrderTotals,
  selectOrdersForTransferAmount,
} from './restaurant-transfer-orders';

function parseInvoiceOrderIds(notes) {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    return Array.isArray(parsed?.invoice_order_ids) ? parsed.invoice_order_ids : null;
  } catch {
    return null;
  }
}

export async function loadRestaurantTransferInvoiceData(supabaseAdmin, transferId) {
  const { data: transfer, error: transferErr } = await supabaseAdmin
    .from('restaurant_transfers')
    .select('*')
    .eq('id', transferId)
    .single();
  if (transferErr || !transfer) {
    return { error: 'Virement introuvable', status: 404 };
  }

  const { data: restaurant, error: restErr } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom, legal_name, siret, vat_number, adresse, code_postal, ville, email, commission_rate')
    .eq('id', transfer.restaurant_id)
    .single();
  if (restErr || !restaurant) {
    return { error: 'Restaurant introuvable', status: 404 };
  }

  const pinnedOrderIds = parseInvoiceOrderIds(transfer.notes);
  let orders = [];

  if (pinnedOrderIds?.length) {
    const { data: pinnedOrders, error: pinnedErr } = await supabaseAdmin
      .from('commandes')
      .select(
        'id, created_at, total, discount_amount, payment_status, commission_rate, commission_amount, restaurant_payout, loyalty_article_subsidy_eur'
      )
      .in('id', pinnedOrderIds)
      .eq('statut', 'livree')
      .order('created_at', { ascending: true });
    if (pinnedErr) {
      return { error: 'Erreur chargement commandes', status: 500 };
    }
    const orderMap = Object.fromEntries((pinnedOrders || []).map((o) => [o.id, o]));
    orders = pinnedOrderIds.map((id) => orderMap[id]).filter(Boolean);
  } else {
    let ordersQuery = supabaseAdmin
      .from('commandes')
      .select(
        'id, created_at, total, discount_amount, payment_status, commission_rate, commission_amount, restaurant_payout, loyalty_article_subsidy_eur'
      )
      .eq('restaurant_id', transfer.restaurant_id)
      .eq('statut', 'livree')
      .order('created_at', { ascending: true });

    if (transfer.period_start && transfer.period_end) {
      ordersQuery = ordersQuery
        .gte('created_at', new Date(transfer.period_start).toISOString())
        .lte('created_at', new Date(`${transfer.period_end}T21:59:59.999Z`).toISOString());
    }

    const { data: ordersRaw, error: ordersErr } = await ordersQuery;
    if (ordersErr) {
      return { error: 'Erreur chargement commandes', status: 500 };
    }

    const paidOrders = (ordersRaw || [])
      .filter((o) => {
        const s = (o.payment_status || '').toString().trim().toLowerCase();
        return !['failed', 'cancelled', 'refunded'].includes(s);
      })
      .map((o) => ({ ...o, _restaurant: restaurant }));

    orders = paidOrders;

    if (!transfer.period_start || !transfer.period_end) {
      const { data: priorTransfers } = await supabaseAdmin
        .from('restaurant_transfers')
        .select('id, amount, transfer_date, created_at')
        .eq('restaurant_id', transfer.restaurant_id)
        .eq('status', 'completed')
        .order('transfer_date', { ascending: true })
        .order('created_at', { ascending: true });

      let startIdx = 0;
      for (const t of priorTransfers || []) {
        if (t.id === transfer.id) break;
        const { nextIdx } = selectOrdersForTransferAmount(paidOrders, startIdx, t.amount);
        startIdx = nextIdx;
      }

      ({ orders } = selectOrdersForTransferAmount(paidOrders, startIdx, transfer.amount));
    }
  }

  const totals = computeTransferOrderTotals(orders, restaurant);
  const invoiceNumber =
    transfer.invoice_number ||
    `FAC-${new Date(transfer.transfer_date).getFullYear()}-${(transfer.id || '').slice(0, 6).toUpperCase()}`;

  const html = buildRestaurantTransferInvoiceHtml({
    restaurant,
    transfer,
    orders,
    totals,
    invoiceNumber,
  });

  return {
    transfer,
    restaurant,
    orders,
    totals,
    invoiceNumber,
    html,
  };
}

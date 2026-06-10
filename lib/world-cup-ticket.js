import crypto from 'crypto';
import {
  WORLD_CUP_END,
  WORLD_CUP_START,
  isWorldCupModeEnabled,
} from '@/lib/world-cup-campaign';

export const WORLD_CUP_MIN_ORDER_EUR = 15;

const CANCELLED_STATUSES = new Set(['annulee', 'refusee', 'cancelled']);

export function generateWorldCupTicketCode() {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CDM-${suffix}`;
}

function isOrderInCampaignWindow(createdAt) {
  const forced = (process.env.WORLD_CUP_MODE || '').toString().trim().toLowerCase();
  if (forced === 'true' || forced === '1' || forced === 'yes') return true;
  const created = new Date(createdAt);
  return created >= WORLD_CUP_START && created <= WORLD_CUP_END;
}

export function isOrderEligibleForWorldCupTicket(order) {
  if (!order || !isWorldCupModeEnabled()) return false;
  if (!isOrderInCampaignWindow(order.created_at || new Date())) return false;

  const payment = (order.payment_status || '').toString().trim().toLowerCase();
  if (payment !== 'paid' && payment !== 'succeeded') return false;

  const statut = (order.statut || '').toString().trim().toLowerCase();
  if (CANCELLED_STATUSES.has(statut)) return false;

  const subtotal = Math.max(
    0,
    parseFloat(order.total || 0) - parseFloat(order.discount_amount || 0)
  );
  return subtotal >= WORLD_CUP_MIN_ORDER_EUR;
}

/**
 * Attribue un code ticket CDM unique à une commande payée (idempotent).
 * @returns {Promise<string|null>}
 */
export async function assignWorldCupTicketIfEligible(supabaseClient, orderId) {
  if (!supabaseClient || !orderId || !isWorldCupModeEnabled()) return null;

  const { data: order, error } = await supabaseClient
    .from('commandes')
    .select(
      'id, world_cup_ticket_code, payment_status, statut, total, discount_amount, created_at'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) return null;
  if (order.world_cup_ticket_code) return order.world_cup_ticket_code;
  if (!isOrderEligibleForWorldCupTicket(order)) return null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateWorldCupTicketCode();
    const { data: updated, error: updateError } = await supabaseClient
      .from('commandes')
      .update({ world_cup_ticket_code: code, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .is('world_cup_ticket_code', null)
      .select('world_cup_ticket_code')
      .maybeSingle();

    if (!updateError && updated?.world_cup_ticket_code) {
      return updated.world_cup_ticket_code;
    }

    const msg = (updateError?.message || '').toLowerCase();
    if (msg.includes('world_cup_ticket_code') && msg.includes('does not exist')) {
      console.warn('⚠️ Colonne world_cup_ticket_code absente — migration CDM non appliquée');
      return null;
    }

    if (updateError?.code === '23505') continue;

    const { data: existing } = await supabaseClient
      .from('commandes')
      .select('world_cup_ticket_code')
      .eq('id', orderId)
      .maybeSingle();
    if (existing?.world_cup_ticket_code) return existing.world_cup_ticket_code;
    break;
  }

  return null;
}

/**
 * Créneaux de livraison : au plus tôt ou fenêtres de 30 min (Paris).
 */

export const DELIVERY_SLOT_PARIS_TZ = 'Europe/Paris';
/** Anciennes commandes encore en « alternative » : auto-confirmées après ce délai (sans action client). */
export const DELIVERY_SLOT_ALTERNATIVE_AUTO_CONFIRM_MS = 30 * 1000; // 30 secondes
const SLOT_STEP_MS = 30 * 60 * 1000;
const MIN_LEAD_MS = 45 * 60 * 1000;
const MAX_LEAD_MS = 2 * 60 * 60 * 1000;

export const DELIVERY_SLOT_STATUS_LABELS = {
  pending: 'En attente de confirmation par le restaurant',
  confirmed: 'Créneau confirmé',
  alternative: 'Le restaurant propose un autre créneau',
  fallback_asap: 'Livraison au plus tôt',
};

export function formatTimeParis(iso, date = new Date()) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: DELIVERY_SLOT_PARIS_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatSlotRangeParis(startIso, endIso) {
  if (!startIso || !endIso) return 'Au plus tôt';
  return `${formatTimeParis(startIso)} – ${formatTimeParis(endIso)}`;
}

/** Options proposées au checkout (client). */
export function generateDeliverySlotOptions(now = new Date()) {
  const slots = [
    {
      id: 'asap',
      type: 'asap',
      label: 'Au plus tôt',
      description: 'Dès que la commande est prête',
      start: null,
      end: null,
    },
  ];

  const nowMs = now.getTime();
  let cursor = Math.ceil((nowMs + MIN_LEAD_MS) / SLOT_STEP_MS) * SLOT_STEP_MS;
  const maxMs = nowMs + MAX_LEAD_MS;

  while (cursor + SLOT_STEP_MS <= maxMs) {
    const startIso = new Date(cursor).toISOString();
    const endIso = new Date(cursor + SLOT_STEP_MS).toISOString();
    slots.push({
      id: `w-${cursor}`,
      type: 'window',
      label: formatSlotRangeParis(startIso, endIso),
      description: 'Sous réserve de confirmation par le restaurant',
      start: startIso,
      end: endIso,
    });
    cursor += SLOT_STEP_MS;
  }

  return slots;
}

export function isWindowInAllowedRange(startIso, endIso, now = new Date()) {
  if (!startIso || !endIso) return false;
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return false;
  if (endMs - startMs !== SLOT_STEP_MS) return false;
  const nowMs = now.getTime();
  const minStart = Math.ceil((nowMs + MIN_LEAD_MS) / SLOT_STEP_MS) * SLOT_STEP_MS;
  const maxEnd = nowMs + MAX_LEAD_MS;
  return startMs >= minStart && endMs <= maxEnd;
}

/** Valide et normalise le payload client checkout. */
export function parseClientDeliverySlot(deliverySlot, now = new Date()) {
  if (!deliverySlot || deliverySlot.type === 'asap' || deliverySlot.id === 'asap') {
    return {
      ok: true,
      type: 'asap',
      status: 'confirmed',
      requested_start: null,
      requested_end: null,
      confirmed_start: null,
      confirmed_end: null,
    };
  }

  if (deliverySlot.type === 'window') {
    const start = deliverySlot.start || null;
    const end = deliverySlot.end || null;
    if (!isWindowInAllowedRange(start, end, now)) {
      return { ok: false, error: 'Créneau de livraison invalide ou expiré. Choisissez un autre créneau.' };
    }
    return {
      ok: true,
      type: 'window',
      status: 'pending',
      requested_start: start,
      requested_end: end,
      confirmed_start: null,
      confirmed_end: null,
    };
  }

  return { ok: false, error: 'Créneau de livraison non reconnu' };
}

export function buildOrderDeliverySlotColumns(parsed) {
  return {
    delivery_slot_type: parsed.type,
    delivery_slot_status: parsed.status,
    delivery_slot_requested_start: parsed.requested_start,
    delivery_slot_requested_end: parsed.requested_end,
    delivery_slot_confirmed_start: parsed.confirmed_start,
    delivery_slot_confirmed_end: parsed.confirmed_end,
    delivery_slot_proposed_start: null,
    delivery_slot_proposed_end: null,
    delivery_slot_partner_note: null,
    delivery_slot_responded_at: parsed.status === 'confirmed' ? new Date().toISOString() : null,
  };
}

/** Libellé affiché (client / livreur / partenaire). */
export function getEffectiveDeliverySlot(order) {
  if (!order) return null;
  const type = order.delivery_slot_type || 'asap';
  const status = order.delivery_slot_status || (type === 'asap' ? 'confirmed' : 'pending');

  let start = null;
  let end = null;
  if (status === 'confirmed') {
    start = order.delivery_slot_confirmed_start || order.delivery_slot_requested_start;
    end = order.delivery_slot_confirmed_end || order.delivery_slot_requested_end;
  } else if (status === 'alternative') {
    start = order.delivery_slot_proposed_start;
    end = order.delivery_slot_proposed_end;
  } else if (status === 'pending') {
    start = order.delivery_slot_requested_start;
    end = order.delivery_slot_requested_end;
  }

  return {
    type,
    status,
    start,
    end,
    label:
      type === 'asap' || status === 'fallback_asap'
        ? 'Au plus tôt'
        : formatSlotRangeParis(start, end),
    statusLabel: DELIVERY_SLOT_STATUS_LABELS[status] || status,
    isPending: status === 'pending',
    needsClientResponse: status === 'alternative',
  };
}

export function getDeliverySlotSummaryLine(order) {
  const slot = getEffectiveDeliverySlot(order);
  if (!slot) return null;
  if (slot.type === 'asap' && slot.status === 'confirmed') return null;
  return `${slot.label}${slot.status === 'pending' ? ' (à confirmer)' : ''}`;
}

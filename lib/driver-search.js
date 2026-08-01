import { createClient } from '@supabase/supabase-js';
import { sendDeliveryAppPush } from './sendDeliveryAppPush';
import { notifyDeliverySubscribers } from './pushNotifications';

export const DRIVER_SEARCH_TTL_MS = 3 * 60 * 1000; // 3 minutes
export const DRIVER_SEARCH_REPUSH_MS = 45 * 1000; // rappel push toutes les ~45s

export function getDriverSearchAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export function isDeliveryOrder(order) {
  return String(order?.order_fulfillment || 'delivery').toLowerCase() !== 'pickup';
}

export function isSearchActive(order, now = Date.now()) {
  if ((order?.driver_search_status || '') !== 'searching') return false;
  if (order?.livreur_id) return false;
  const exp = order?.driver_search_expires_at
    ? new Date(order.driver_search_expires_at).getTime()
    : 0;
  return exp > now;
}

/**
 * Démarre / relance une recherche livreur (commande unpaid, livraison).
 */
export async function startDriverSearch(orderId, { supabaseAdmin } = {}) {
  const db = supabaseAdmin || getDriverSearchAdmin();
  const { data: order, error } = await db.from('commandes').select('*').eq('id', orderId).single();
  if (error || !order) throw new Error('Commande introuvable');

  if (!isDeliveryOrder(order)) {
    throw new Error('Recherche livreur uniquement pour la livraison');
  }
  if (['paid', 'succeeded'].includes(String(order.payment_status || '').toLowerCase())) {
    throw new Error('Commande déjà payée');
  }
  if (order.statut === 'annulee' || order.payment_status === 'refunded') {
    throw new Error('Commande annulée');
  }
  if (order.livreur_id && order.driver_search_status === 'reserved') {
    return { order, alreadyReserved: true };
  }

  const now = new Date();
  const expires = new Date(now.getTime() + DRIVER_SEARCH_TTL_MS);

  const { data: updated, error: updErr } = await db
    .from('commandes')
    .update({
      livreur_id: null,
      driver_search_status: 'searching',
      driver_search_started_at: now.toISOString(),
      driver_search_expires_at: expires.toISOString(),
      driver_search_last_push_at: now.toISOString(),
      driver_reserved_at: null,
      updated_at: now.toISOString(),
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (updErr) throw new Error(updErr.message || 'Impossible de démarrer la recherche');

  await pushDriversForSearch(updated, { force: true }).catch((e) =>
    console.warn('push search:', e?.message)
  );

  return { order: updated, alreadyReserved: false };
}

export async function pushDriversForSearch(order, { force = false } = {}) {
  const db = getDriverSearchAdmin();
  const now = Date.now();
  if (!isSearchActive(order, now) && !force) return { skipped: true };

  if (!force && order.driver_search_last_push_at) {
    const last = new Date(order.driver_search_last_push_at).getTime();
    if (now - last < DRIVER_SEARCH_REPUSH_MS - 2000) {
      return { skipped: true, reason: 'too_soon' };
    }
  }

  const shortId = String(order.id || '').slice(0, 8);

  await sendDeliveryAppPush({
    orderId: order.id,
    // total volontairement omis pour les livreurs (voir sendDeliveryAppPush)
    data: {
      type: 'new_order_available',
      orderId: order.id,
      url: '/delivery/dashboard',
      prepay_search: true,
    },
  }).catch(() => {});

  await notifyDeliverySubscribers(db, {
    title: 'Course à accepter 🚚',
    body: shortId
      ? `Nouvelle course #${shortId} — ouvre l’app pour accepter`
      : 'Une nouvelle course t’attend',
    data: {
      type: 'new_order_available',
      orderId: order.id,
      url: '/delivery/dashboard',
      prepay_search: true,
    },
  }).catch(() => {});

  await db
    .from('commandes')
    .update({ driver_search_last_push_at: new Date().toISOString() })
    .eq('id', order.id);

  return { pushed: true };
}

export async function expireDriverSearchIfNeeded(order, { supabaseAdmin } = {}) {
  const db = supabaseAdmin || getDriverSearchAdmin();
  if ((order?.driver_search_status || '') !== 'searching') return order;
  if (order?.livreur_id) return order;
  const exp = order?.driver_search_expires_at
    ? new Date(order.driver_search_expires_at).getTime()
    : 0;
  if (exp > Date.now()) return order;

  const { data: updated } = await db
    .from('commandes')
    .update({
      driver_search_status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('driver_search_status', 'searching')
    .is('livreur_id', null)
    .select('*')
    .maybeSingle();

  return updated || { ...order, driver_search_status: 'expired' };
}

export async function getDriverSearchStatus(orderId, { supabaseAdmin } = {}) {
  const db = supabaseAdmin || getDriverSearchAdmin();
  let { data: order, error } = await db.from('commandes').select('*').eq('id', orderId).single();
  if (error || !order) throw new Error('Commande introuvable');

  order = await expireDriverSearchIfNeeded(order, { supabaseAdmin: db });

  // Rappels push tant que la recherche est active
  if (isSearchActive(order)) {
    await pushDriversForSearch(order).catch(() => {});
    const refreshed = await db.from('commandes').select('*').eq('id', orderId).single();
    if (refreshed.data) order = refreshed.data;
  }

  const reserved = Boolean(order.livreur_id) && order.driver_search_status === 'reserved';
  let driver = null;
  if (order.livreur_id) {
    const { data: d } = await db
      .from('users')
      .select('id, prenom, nom')
      .eq('id', order.livreur_id)
      .maybeSingle();
    if (d) {
      driver = {
        id: d.id,
        name: `${d.prenom || ''} ${d.nom || ''}`.trim() || 'Livreur',
      };
    }
  }

  const expiresAt = order.driver_search_expires_at
    ? new Date(order.driver_search_expires_at).getTime()
    : null;
  const remainingMs =
    order.driver_search_status === 'searching' && expiresAt
      ? Math.max(0, expiresAt - Date.now())
      : 0;

  return {
    orderId: order.id,
    status: order.driver_search_status || null,
    payment_status: order.payment_status,
    livreur_id: order.livreur_id,
    reserved,
    driver,
    expires_at: order.driver_search_expires_at,
    remaining_ms: remainingMs,
    order_fulfillment: order.order_fulfillment || 'delivery',
    total: order.total,
    frais_livraison: order.frais_livraison,
  };
}

export async function notifyAssignedDriver(order, { title, body, type }) {
  if (!order?.livreur_id) return;
  const { sendPushToUserIds } = await import('./sendDeliveryAppPush');
  await sendPushToUserIds([order.livreur_id], title, body, {
    type: type || 'delivery_update',
    orderId: order.id,
    url: '/delivery/dashboard',
  }).catch(() => {});
}

import sseBroadcaster from './sse-broadcast';

export function isPickupOrder(order) {
  return String(order?.order_fulfillment || 'delivery').toLowerCase() === 'pickup';
}

/**
 * Notifie le restaurant partenaire d'une nouvelle commande payée (retrait sur place : sans livreur).
 */
export async function notifyPartnerNewOrder(order, { supabaseAdmin, origin } = {}) {
  if (!order?.restaurant_id || !order?.id) return false;

  const pickup = isPickupOrder(order);
  const totalWithDelivery = (
    parseFloat(order.total || 0) + parseFloat(order.frais_livraison || 0)
  ).toFixed(2);

  const payload = {
    type: 'new_order',
    message: pickup
      ? `Nouvelle commande retrait #${order.id.slice(0, 8)} - ${totalWithDelivery}€`
      : `Nouvelle commande #${order.id.slice(0, 8)} - ${totalWithDelivery}€`,
    order,
    timestamp: new Date().toISOString(),
  };

  sseBroadcaster.broadcast(order.restaurant_id, payload);

  if (supabaseAdmin) {
    try {
      const { data: rest } = await supabaseAdmin
        .from('restaurants')
        .select('user_id')
        .eq('id', order.restaurant_id)
        .maybeSingle();

      if (rest?.user_id) {
        const base = origin || process.env.NEXT_PUBLIC_BASE_URL || 'https://cvneat.fr';
        await fetch(`${base}/api/notifications/send-push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: rest.user_id,
            title: pickup ? 'Nouvelle commande à emporter 🛍️' : 'Nouvelle commande ✅',
            body: pickup
              ? `Retrait #${order.id.slice(0, 8)} - ${totalWithDelivery}€`
              : `Commande #${order.id.slice(0, 8)} - ${totalWithDelivery}€`,
            data: { type: 'new_order', orderId: order.id, url: '/partner' },
          }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('⚠️ notifyPartnerNewOrder push:', e?.message || e);
    }
  }

  return true;
}

/**
 * Relais central pour déclencher la popup « nouvelle commande » côté partenaire.
 * Utilisé par push Capacitor, SSE, Realtime — évite que le push système soit le seul signal reçu.
 */

export function dispatchPartnerNewOrder(order) {
  if (typeof window === 'undefined' || !order?.id) return false;
  try {
    window.dispatchEvent(new CustomEvent('partner-new-order', { detail: order }));
    return true;
  } catch (e) {
    console.warn('dispatchPartnerNewOrder:', e?.message || e);
    return false;
  }
}

/** Push FCM/APNs : payload minimal { type, orderId } → fetch commande puis popup. */
export async function dispatchPartnerNewOrderFromPushData(data) {
  if (!data || data.type !== 'new_order') return false;

  const orderId = (data.orderId || data.order_id || '').toString().trim();
  if (!orderId) return false;

  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: row, error } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !row) {
      console.warn('dispatchPartnerNewOrderFromPushData: commande introuvable', orderId, error?.message);
      return false;
    }

    if (row.statut !== 'en_attente') {
      console.log('dispatchPartnerNewOrderFromPushData: commande déjà traitée', orderId, row.statut);
      return false;
    }

    return dispatchPartnerNewOrder(row);
  } catch (e) {
    console.warn('dispatchPartnerNewOrderFromPushData:', e?.message || e);
    return false;
  }
}

/**
 * Chronomètre de préparation / livraison basé sur les horodatages serveur (persistants au refresh).
 */

export function parseOrderDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Début du décompte préparation (ne pas utiliser updated_at : change à chaque MAJ commande). */
export function getPreparationStartDate(order) {
  if (!order) return null;
  return (
    parseOrderDate(order.preparation_started_at) ||
    parseOrderDate(order.accepted_at) ||
    parseOrderDate(order.created_at) ||
    parseOrderDate(order.createdAt) ||
    null
  );
}

export function isPickupOrder(order) {
  const f = (order?.order_fulfillment || '').toString().toLowerCase();
  return f === 'pickup' || f === 'retrait' || f === 'sur_place';
}

export function isOrderCompleted(order) {
  const s = (order?.statut || order?.status || '').toString().toLowerCase();
  return ['livree', 'delivered', 'annulee', 'cancelled', 'refusee', 'rejected'].includes(s);
}

/**
 * @returns {{ remainingSeconds: number, totalSeconds: number, label: string, elapsedSeconds: number } | null}
 */
export function getOrderActiveCountdown(order, nowTs = Date.now()) {
  if (!order || isOrderCompleted(order)) return null;

  const status = (order.statut || order.status || '').toString().toLowerCase();
  const pickup = isPickupOrder(order);
  const prepMinutes = Math.max(1, parseInt(order.preparation_time || 30, 10) || 30);
  const deliveryMinutes = 20;

  let start = null;
  let totalSeconds = null;
  let label = '';

  if (!pickup && status === 'en_livraison') {
    start =
      parseOrderDate(order.picked_up_at) ||
      parseOrderDate(order.preparation_started_at) ||
      parseOrderDate(order.accepted_at) ||
      parseOrderDate(order.created_at);
    totalSeconds = deliveryMinutes * 60;
    label = 'Livraison estimée';
  } else {
    start = getPreparationStartDate(order);
    totalSeconds = prepMinutes * 60;
    label = pickup ? 'Préparation avant retrait' : 'Préparation estimée';
  }

  if (!start || !totalSeconds) return null;

  const elapsedSeconds = Math.max(0, Math.floor((nowTs - start.getTime()) / 1000));
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  return { remainingSeconds, totalSeconds, elapsedSeconds, label };
}

export function formatCountdownMmSs(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

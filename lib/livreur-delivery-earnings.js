/**
 * Rémunération livreur : la réduction CVNeat Plus sur les frais client ne doit pas réduire la base course.
 * @param {{ frais_livraison?: unknown; frais_livraison_course?: unknown }} order
 * @returns {number}
 */
export function livreurDeliveryBaseEur(order) {
  const course = order?.frais_livraison_course;
  if (course != null && course !== '') {
    const n = parseFloat(course);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return Math.max(0, parseFloat(order?.frais_livraison || 0) || 0);
}

/**
 * Gain net livreur sur une commande livrée (hors virement déjà enregistré).
 * @param {{ frais_livraison?: unknown; frais_livraison_course?: unknown; delivery_commission_cvneat?: unknown }} order
 * @returns {number}
 */
export function livreurEarningNetEur(order) {
  const base = livreurDeliveryBaseEur(order);
  const commission = Math.max(0, parseFloat(order?.delivery_commission_cvneat || 0) || 0);
  return Math.round((base - commission) * 100) / 100;
}

/**
 * Pour l’UI / API livreur : expose le gain net, masque le total client et la commission.
 */
export function sanitizeOrderAmountsForLivreur(order) {
  if (!order || typeof order !== 'object') return order;
  const gain = livreurEarningNetEur(order);
  const {
    total: _t,
    total_paid: _tp,
    frais_livraison: _fl,
    frais_livraison_course: _flc,
    delivery_commission_cvneat: _dc,
    sous_total: _st,
    discount_amount: _da,
    ...rest
  } = order;
  return {
    ...rest,
    gain,
    // Alias UI historique — toujours le net livreur, jamais le montant client
    delivery_fee: gain,
  };
}

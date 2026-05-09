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

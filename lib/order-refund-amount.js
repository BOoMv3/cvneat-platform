/**
 * Montant remboursable client = ce qui a été encaissé Stripe.
 * Préfère total_paid ; sinon recalcule articles − promo + livraison + frais plateforme − promo plateforme.
 */

const PLATFORM_FEE_EUR = 0.49;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function computeOrderRefundableAmountEur(order) {
  if (!order) return 0;

  const storedPaid = order.total_paid;
  if (storedPaid != null && storedPaid !== '' && !Number.isNaN(parseFloat(storedPaid))) {
    return Math.max(0, round2(parseFloat(storedPaid)));
  }

  const total = parseFloat(order.total || 0) || 0;
  const discount = parseFloat(order.discount_amount || 0) || 0;
  const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
  const platformDiscount = parseFloat(order.platform_discount_amount || 0) || 0;
  const platformFee =
    order.platform_fee_amount != null && order.platform_fee_amount !== ''
      ? parseFloat(order.platform_fee_amount) || 0
      : PLATFORM_FEE_EUR;

  return Math.max(
    0,
    round2(total - discount + deliveryFee + platformFee - platformDiscount)
  );
}

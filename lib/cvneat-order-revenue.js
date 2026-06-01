/**
 * Revenu net CVN'EAT par commande livrée (aligné création commande + promos plateforme).
 */

const PLATFORM_FEE_EUR = 0.49;

/**
 * @param {object} order - ligne commandes
 * @param {object} [options]
 * @param {number} [options.commissionRate] - taux décimal (ex. 0.2), si pas de commission_amount stockée
 */
export function computeCvneatNetRevenueEur(order, options = {}) {
  const totalArticles = parseFloat(order?.total || 0) || 0;
  const discount = parseFloat(order?.discount_amount || 0) || 0;
  const orderAmount = Math.max(0, totalArticles - discount);

  const storedCommission =
    order?.commission_amount != null ? parseFloat(order.commission_amount) : null;
  const commissionRate = options.commissionRate ?? 0.2;
  const commission =
    storedCommission != null && !Number.isNaN(storedCommission)
      ? storedCommission
      : Math.round(orderAmount * commissionRate * 100) / 100;

  const deliveryCommission = parseFloat(order?.delivery_commission_cvneat || 0) || 0;
  const platformDiscount = parseFloat(order?.platform_discount_amount || 0) || 0;
  const loyaltySubsidy = parseFloat(order?.loyalty_article_subsidy_eur || 0) || 0;

  const gross =
    commission + PLATFORM_FEE_EUR + deliveryCommission;
  const net = Math.round((gross - platformDiscount - loyaltySubsidy) * 100) / 100;

  return {
    net,
    gross,
    commission,
    platformFee: PLATFORM_FEE_EUR,
    deliveryCommission,
    platformDiscount,
    loyaltySubsidy,
    orderAmount,
  };
}

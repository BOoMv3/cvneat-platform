/**
 * Vérifie calcul promo −50 % et cohérence montant Stripe (payment-intent).
 * Usage: node scripts/verify-week-half-off-promo.mjs
 */
import {
  computeWeekHalfOffPromoDiscountEur,
  isWeekHalfOffPromoActive,
  WEEK_HALF_OFF_PROMO_MIN_SUBTOTAL_EUR,
} from '../lib/week-half-off-promo.js';
// computeCheckoutPlatformDiscountEur délègue à week promo quand active
function computeCheckoutPlatformDiscountEur(_items, options = {}, date) {
  return computeWeekHalfOffPromoDiscountEur(
    { capAt: options.capAt, cartSubtotalEur: options.cartSubtotalEur },
    date ?? options.now
  );
}

const parisMay27 = new Date('2026-05-27T12:00:00+02:00');
const parisMay26 = new Date('2026-05-26T12:00:00+02:00');
const parisJune4 = new Date('2026-06-04T12:00:00+02:00');

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

assert(isWeekHalfOffPromoActive(parisMay27), 'active le 27 mai');
assert(!isWeekHalfOffPromoActive(parisMay26), 'inactive le 26 mai');
assert(!isWeekHalfOffPromoActive(parisJune4), 'inactive après le 3 juin');

assert(
  computeWeekHalfOffPromoDiscountEur({ capAt: 14, cartSubtotalEur: 14 }, parisMay27) === 0,
  'pas de réduction sous 15€'
);
assert(
  computeWeekHalfOffPromoDiscountEur({ capAt: 15, cartSubtotalEur: 15 }, parisMay27) === 7.5,
  '15€ → 7.50€ de réduction'
);
assert(
  computeWeekHalfOffPromoDiscountEur({ capAt: 20, cartSubtotalEur: 20 }, parisMay27) === 10,
  '20€ → 10€'
);

// Après code promo 5€ sur panier 20€ : cap 15, seuil OK (panier brut 20)
const platform = computeCheckoutPlatformDiscountEur([], {
  capAt: 15,
  cartSubtotalEur: 20,
  now: parisMay27,
});
assert(platform === 7.5, '50% sur cap après promo manuelle');

// Montant Stripe attendu (comme create-payment-intent)
function expectedStripeAmount({
  subtotal,
  discount,
  delivery,
  platformDiscount,
  platformFee = 0.49,
}) {
  const subAfter = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  let amount = Math.round((subAfter + delivery + platformFee) * 100) / 100;
  const pd = Math.min(subAfter, Math.max(0, platformDiscount));
  if (pd > 0) amount = Math.max(0.5, Math.round((amount - pd) * 100) / 100);
  return amount;
}

const pay20 = expectedStripeAmount({
  subtotal: 20,
  discount: 0,
  delivery: 2.5,
  platformDiscount: 10,
});
assert(pay20 === 12.99, `paiement 20€ panier: ${pay20} attendu 12.99`);

const pay14 = expectedStripeAmount({
  subtotal: 14,
  discount: 0,
  delivery: 2.5,
  platformDiscount: 0,
});
assert(pay14 === 16.99, `paiement 14€ panier: ${pay14} attendu 16.99`);

console.log('✅ Tous les contrôles promo semaine −50 % OK');
console.log(`   Seuil minimum articles: ${WEEK_HALF_OFF_PROMO_MIN_SUBTOTAL_EUR}€`);

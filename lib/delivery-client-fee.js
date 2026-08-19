/** Supplément livraison facturé au client (€). */
export const CLIENT_DELIVERY_SURCHARGE_EUR = 1;

/** Frais minimum client après garde-fou serveur (ancien 2,50 € + supplément). */
export const CLIENT_DELIVERY_MIN_FEE_EUR = 2.5 + CLIENT_DELIVERY_SURCHARGE_EUR;

/**
 * Applique le supplément client sur les frais de livraison (> 0).
 * Livraison offerte (0 €) inchangée.
 */
export function applyClientDeliverySurcharge(feeEur) {
  const f = parseFloat(feeEur);
  if (Number.isNaN(f) || f <= 0) return f;
  return Math.round((f + CLIENT_DELIVERY_SURCHARGE_EUR) * 100) / 100;
}

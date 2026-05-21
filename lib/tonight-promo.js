export const TONIGHT_PROMO = {
  name: 'Promo ce soir',
  minSubtotalEur: 30,
  discountEur: 10,
  /** Jeudi 21 mai 2026, minuit → 23:59:59 (heure de Paris), en UTC (CEST +2). */
  startAtUtc: '2026-05-20T22:00:00.000Z',
  endAtUtc: '2026-05-21T21:59:59.999Z',
};

export const TONIGHT_PROMO_BANNER =
  "🔥 CE SOIR SUR CVN'EAT 🔥 💥 -10€ dès 30€ d'achat 🍕 (automatique au checkout)";

export function getTonightAutoPromo(subtotalEur, now = new Date()) {
  const subtotal = Math.max(0, Number(subtotalEur) || 0);
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const startMs = new Date(TONIGHT_PROMO.startAtUtc).getTime();
  const endMs = new Date(TONIGHT_PROMO.endAtUtc).getTime();
  const isInWindow = Number.isFinite(nowMs) && nowMs >= startMs && nowMs <= endMs;
  const eligible = isInWindow && subtotal >= TONIGHT_PROMO.minSubtotalEur;
  const discountEur = eligible ? TONIGHT_PROMO.discountEur : 0;

  return {
    active: isInWindow,
    eligible,
    discountEur,
    minSubtotalEur: TONIGHT_PROMO.minSubtotalEur,
    endsAtUtc: TONIGHT_PROMO.endAtUtc,
    name: TONIGHT_PROMO.name,
  };
}

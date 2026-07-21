/**
 * Synchronise users.cvneat_plus_ends_at depuis un abonnement Stripe.
 * @param {import('stripe').Subscription} sub
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 */
export async function applyCvneatPlusFromStripeSubscription(sub, db) {
  if (!db || !sub) return { ok: false, reason: 'missing_args' };

  let userId = sub.metadata?.supabase_user_id || null;
  if (!userId && sub.customer && typeof sub.customer === 'object') {
    userId = sub.customer.metadata?.supabase_user_id || null;
  }

  if (!userId) {
    console.warn("CVN'EAT Plus: subscription sans supabase_user_id", sub.id);
    return { ok: false, reason: 'no_user_id' };
  }

  const status = (sub.status || '').toLowerCase();
  const endSec = resolveSubscriptionPeriodEndSec(sub);

  if (['active', 'trialing', 'past_due'].includes(status)) {
    if (typeof endSec !== 'number') {
      console.warn("CVN'EAT Plus: pas de current_period_end pour", sub.id);
      return { ok: false, reason: 'no_period_end' };
    }
    const endsAt = new Date(endSec * 1000).toISOString();
    const { error } = await db.from('users').update({ cvneat_plus_ends_at: endsAt }).eq('id', userId);
    if (error) {
      console.warn("CVN'EAT Plus: update cvneat_plus_ends_at", error.message);
      return { ok: false, reason: error.message };
    }
    return { ok: true, userId, endsAt, status };
  }

  const { error } = await db.from('users').update({ cvneat_plus_ends_at: null }).eq('id', userId);
  if (error) {
    console.warn("CVN'EAT Plus: clear cvneat_plus_ends_at", error.message);
    return { ok: false, reason: error.message };
  }
  return { ok: true, userId, endsAt: null, status };
}

/** Stripe API récente : period end parfois sur l’item. */
export function resolveSubscriptionPeriodEndSec(sub) {
  if (!sub) return null;
  if (typeof sub.current_period_end === 'number') return sub.current_period_end;
  const item = sub.items?.data?.[0];
  if (typeof item?.current_period_end === 'number') return item.current_period_end;
  if (typeof sub.trial_end === 'number' && sub.trial_end > Math.floor(Date.now() / 1000)) {
    return sub.trial_end;
  }
  // Dernier recours : ancre + ~1 mois
  if (typeof sub.billing_cycle_anchor === 'number') {
    return sub.billing_cycle_anchor + 30 * 24 * 3600;
  }
  return null;
}

/**
 * Retrouve l’abonnement Plus actif d’un user via Stripe (metadata ou customer).
 */
export async function findCvneatPlusSubscriptionForUser(stripe, { userId, customerId }) {
  if (!stripe || !userId) return null;

  if (customerId) {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 20,
    });
    const match = (list.data || []).find((s) => {
      const product = s.metadata?.product;
      const uid = s.metadata?.supabase_user_id;
      return (
        (product === 'cvneat_plus' || product === 'vneat_plus' || uid === userId) &&
        ['active', 'trialing', 'past_due'].includes((s.status || '').toLowerCase())
      );
    });
    if (match) return match;
  }

  // Fallback : scan récent (projets petits)
  const recent = await stripe.subscriptions.list({ status: 'active', limit: 100 });
  return (
    (recent.data || []).find(
      (s) =>
        s.metadata?.supabase_user_id === userId &&
        (s.metadata?.product === 'cvneat_plus' ||
          s.metadata?.product === 'vneat_plus' ||
          !!s.metadata?.supabase_user_id)
    ) || null
  );
}

/**
 * Resynchronise un user depuis Stripe → users.cvneat_plus_ends_at
 */
export async function syncCvneatPlusForUser({ stripe, db, userId, customerId }) {
  if (!stripe || !db || !userId) return { ok: false, reason: 'missing_args' };

  const sub = await findCvneatPlusSubscriptionForUser(stripe, { userId, customerId });
  if (!sub) {
    // Pas d’abo actif : ne pas forcément effacer (évite faux négatifs si Stripe rate limité)
    return { ok: true, synced: false, active: false };
  }

  // Garantir metadata user id
  if (!sub.metadata?.supabase_user_id) {
    try {
      await stripe.subscriptions.update(sub.id, {
        metadata: { ...sub.metadata, supabase_user_id: userId, product: 'cvneat_plus' },
      });
      sub.metadata = { ...sub.metadata, supabase_user_id: userId, product: 'cvneat_plus' };
    } catch {
      // ignore
    }
  }

  const result = await applyCvneatPlusFromStripeSubscription(sub, db);
  return { ...result, synced: true, active: ['active', 'trialing', 'past_due'].includes(sub.status), subscriptionId: sub.id };
}

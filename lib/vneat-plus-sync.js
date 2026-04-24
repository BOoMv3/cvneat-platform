import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Met à jour users.vneat_plus_ends_at à partir d’un abonnement Stripe.
 * @param {import('stripe').Subscription} sub
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 */
export async function applyVneatPlusFromStripeSubscription(sub, db) {
  if (!db || !sub) return;
  const userId = sub.metadata?.supabase_user_id;
  if (!userId) {
    console.warn('CVN’Plus: subscription sans supabase_user_id', sub.id);
    return;
  }
  const status = (sub.status || '').toLowerCase();
  const endSec = sub.current_period_end;
  if (typeof endSec !== 'number') {
    return;
  }
  const endsAt = new Date(endSec * 1000).toISOString();
  if (['active', 'trialing', 'past_due'].includes(status)) {
    const { error } = await db.from('users').update({ vneat_plus_ends_at: endsAt }).eq('id', userId);
    if (error) {
      console.warn('CVN’Plus: update vneat_plus_ends_at', error.message);
    }
  } else {
    const { error } = await db.from('users').update({ vneat_plus_ends_at: null }).eq('id', userId);
    if (error) {
      console.warn('CVN’Plus: clear vneat_plus_ends_at', error.message);
    }
  }
}

/**
 * Récupère l’abonnement CVN'Plus côté Stripe (metadata product ou price id).
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 */
export async function syncVneatPlusForUserFromStripe(userId, db) {
  if (!userId || !db) return;
  const { data: row, error: uerr } = await db.from('users').select('stripe_customer_id').eq('id', userId).maybeSingle();
  if (uerr || !row?.stripe_customer_id) return;

  const list = await stripe.subscriptions.list({
    customer: row.stripe_customer_id,
    status: 'all',
    limit: 10,
  });
  const priceId = (process.env.STRIPE_VNEAT_PLUS_PRICE_ID || '').trim();
  for (const sub of list.data) {
    const hasPrice =
      (sub.items?.data || []).some((i) => i?.price?.id && (!priceId || i.price.id === priceId)) ||
      sub.metadata?.product === 'vneat_plus';
    if (hasPrice) {
      await applyVneatPlusFromStripeSubscription(sub, db);
      return;
    }
  }
  await db.from('users').update({ vneat_plus_ends_at: null }).eq('id', userId);
}

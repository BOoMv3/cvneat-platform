/**
 * Synchronise users.cvneat_plus_ends_at depuis un abonnement Stripe.
 * @param {import('stripe').Subscription} sub
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 */
export async function applyCvneatPlusFromStripeSubscription(sub, db) {
  if (!db || !sub) return;
  const userId = sub.metadata?.supabase_user_id;
  if (!userId) {
    console.warn("CVN'EAT Plus: subscription sans supabase_user_id", sub.id);
    return;
  }
  const status = (sub.status || '').toLowerCase();
  const endSec = sub.current_period_end;
  if (typeof endSec !== 'number') {
    return;
  }
  const endsAt = new Date(endSec * 1000).toISOString();
  if (['active', 'trialing', 'past_due'].includes(status)) {
    const { error } = await db.from('users').update({ cvneat_plus_ends_at: endsAt }).eq('id', userId);
    if (error) {
      console.warn("CVN'EAT Plus: update cvneat_plus_ends_at", error.message);
    }
  } else {
    const { error } = await db.from('users').update({ cvneat_plus_ends_at: null }).eq('id', userId);
    if (error) {
      console.warn("CVN'EAT Plus: clear cvneat_plus_ends_at", error.message);
    }
  }
}

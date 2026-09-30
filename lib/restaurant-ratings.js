/**
 * Agrège les notes depuis la table `reviews` (colonnes restaurants.rating absentes / non fiables).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} [restaurantIds] Si fourni, filtre ; sinon tous les avis.
 * @returns {Promise<Record<string, { rating: number, reviews_count: number }>>}
 */
export async function aggregateRestaurantRatings(supabase, restaurantIds) {
  let query = supabase.from('reviews').select('restaurant_id, rating');
  if (Array.isArray(restaurantIds) && restaurantIds.length > 0) {
    query = query.in('restaurant_id', restaurantIds);
  }
  const { data, error } = await query;
  if (error) {
    console.error('aggregateRestaurantRatings:', error.message);
    return {};
  }

  const map = {};
  for (const row of data || []) {
    const id = row.restaurant_id;
    if (!id) continue;
    const r = Number(row.rating);
    if (!Number.isFinite(r)) continue;
    if (!map[id]) map[id] = { sum: 0, count: 0 };
    map[id].sum += r;
    map[id].count += 1;
  }

  const out = {};
  for (const [id, { sum, count }] of Object.entries(map)) {
    out[id] = {
      rating: Math.round((sum / count) * 10) / 10,
      reviews_count: count,
    };
  }
  return out;
}

/**
 * Recalcule et tente de persister rating/reviews_count sur restaurants (no-op si colonnes absentes).
 */
export async function refreshRestaurantRating(supabase, restaurantId) {
  if (!restaurantId) return null;
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('restaurant_id', restaurantId);
  if (error) {
    console.error('refreshRestaurantRating select:', error.message);
    return null;
  }
  const count = reviews?.length || 0;
  const rating =
    count > 0
      ? Math.round((reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count) * 10) / 10
      : 0;

  const { error: upErr } = await supabase
    .from('restaurants')
    .update({ rating, reviews_count: count })
    .eq('id', restaurantId);
  if (upErr) {
    // Colonnes absentes : OK, l'affichage lit reviews en live
    console.warn('refreshRestaurantRating update skipped:', upErr.message);
  }
  return { rating, reviews_count: count };
}

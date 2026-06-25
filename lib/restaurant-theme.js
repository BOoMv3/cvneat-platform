/** Thèmes visuels par restaurant (fiche menu CVN'EAT). */

/** La Bonne Pâte — Ganges (prod Supabase). */
export const LA_BONNE_PATE_RESTAURANT_ID = 'd6725fe6-59ec-413a-b39b-ddb960824999';

export const LA_BONNE_PATE_TAGLINE =
  'Restaurant · Pizza & Pasta · Produits frais · Ganges';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getRestaurantId(restaurantOrId) {
  if (!restaurantOrId) return null;
  if (typeof restaurantOrId === 'string') {
    const trimmed = restaurantOrId.trim();
    return UUID_RE.test(trimmed) ? trimmed : null;
  }
  return restaurantOrId.id || restaurantOrId.restaurant_id || null;
}

/** Thème réservé à La Bonne Pâte — vérification stricte par UUID. */
export function isLaBonnePateRestaurant(restaurantOrId) {
  return getRestaurantId(restaurantOrId) === LA_BONNE_PATE_RESTAURANT_ID;
}

/** Identifiant de thème CSS (`theme-*` sur le conteneur page). */
export function getRestaurantThemeId(restaurantOrId) {
  if (isLaBonnePateRestaurant(restaurantOrId)) return 'la-bonne-pate';
  return null;
}

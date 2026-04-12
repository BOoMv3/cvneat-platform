/**
 * Restos à garder fermés côté app tant que la config BDD / admin n’est pas fiable.
 * Retirer une entrée dès que `ferme_manuellement` ou les horaires sont corrects en base.
 */

function normalizeForMatch(value) {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[''´`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sous-chaînes présentes dans `nom` ou `slug` (après normalisation) → `is_open_now` forcé à false si pas `ouvert_manuellement`. */
const HARD_CLOSED_SUBSTRINGS = [
  'saona tea',
  'osaona tea',
  'o saona',
  'osaona', // O'Saona → apostrophe retirée
];

/**
 * @param {Record<string, unknown>|null|undefined} restaurantLike
 * @returns {boolean}
 */
export function isRestaurantHardClosed(restaurantLike) {
  if (!restaurantLike || typeof restaurantLike !== 'object') return false;
  const nom = normalizeForMatch(restaurantLike.nom ?? restaurantLike.name ?? '');
  const slug = normalizeForMatch(
    restaurantLike.slug ?? restaurantLike.slug_restaurant ?? restaurantLike.restaurant_slug ?? '',
  );
  const hay = `${nom} ${slug}`;
  return HARD_CLOSED_SUBSTRINGS.some((s) => hay.includes(s));
}

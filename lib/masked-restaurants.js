/** Restaurants retirés de la vitrine client (web + app). */

const normalizeRestaurantName = (value = '') =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Sous-chaînes du nom normalisé → restaurant masqué. */
export const MASKED_RESTAURANT_NAME_PARTS = [
  'molokai',
  'cinq pizza',
  'au bon coin',
];

export function isMaskedRestaurantName(nom) {
  const n = normalizeRestaurantName(nom);
  if (!n) return false;
  return MASKED_RESTAURANT_NAME_PARTS.some((part) => n.includes(part));
}

/** Compare des IDs restaurant (UUID ou nombre) sans parseInt qui casse les UUID. */
export function sameRestaurantId(a, b) {
  if (a == null || b == null) return false;
  return String(a).trim() === String(b).trim();
}

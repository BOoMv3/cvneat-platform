/**
 * Affichage client : aligné sur computeRestaurantOpenState (fermé seulement si ferme_manuellement).
 */

import { computeRestaurantOpenState } from './restaurant-open-compute';

/** Flags ouvert/fermé à partir du seul objet restaurant (évite fallback « fermé » sur l’accueil). */
export function getResolvedOpenFlags(restaurant) {
  return resolveRestaurantOpenFromSources({ restaurant, openStatusRow: null });
}

/**
 * @param {{ restaurant: object, openStatusRow?: unknown, now?: Date }}
 */
export function resolveRestaurantOpenFromSources({ restaurant, openStatusRow: _ignored, now = new Date() }) {
  const st = computeRestaurantOpenState({
    id: restaurant?.id ?? null,
    horaires: restaurant?.horaires,
    ferme_manuellement: restaurant?.ferme_manuellement,
    ouvert_manuellement: restaurant?.ouvert_manuellement,
    now,
  });
  return {
    isOpen: st.isOpen === true,
    isManuallyClosed: st.isManuallyClosed === true,
  };
}

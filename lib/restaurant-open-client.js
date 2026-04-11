/**
 * Affichage client : aligné sur computeRestaurantOpenState (ouvert = ouvert_manuellement uniquement).
 */

import { computeRestaurantOpenState } from './restaurant-open-compute';

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

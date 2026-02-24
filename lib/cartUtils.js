/**
 * Calcul du total par ligne et du panier (prix de base + suppléments + taille + boisson + viandes/sauces).
 * Utilisé partout (page d'accueil, panier, checkout) pour que l'affichage = montant facturé.
 */

export function getItemLineTotal(item) {
  if (!item) return 0;
  let itemPrice = parseFloat(item?.prix ?? item?.price ?? 0);
  const itemQuantity = parseInt(item?.quantity ?? 1, 10);

  if (!item?.price_includes_extras) {
    let supplementsPrice = 0;
    if (Array.isArray(item?.supplements)) {
      supplementsPrice = item.supplements.reduce(
        (acc, sup) => acc + (parseFloat(sup?.prix ?? sup?.price ?? 0) || 0),
        0
      );
    }
    let meatsPrice = 0;
    if (Array.isArray(item?.customizations?.selectedMeats)) {
      meatsPrice = item.customizations.selectedMeats.reduce(
        (acc, m) => acc + (parseFloat(m?.prix ?? m?.price ?? 0) || 0),
        0
      );
    }
    let saucesPrice = 0;
    if (Array.isArray(item?.customizations?.selectedSauces)) {
      saucesPrice = item.customizations.selectedSauces.reduce(
        (acc, s) => acc + (parseFloat(s?.prix ?? s?.price ?? 0) || 0),
        0
      );
    }
    let sizePrice = 0;
    if (item?.size && typeof item.size === 'object' && item.size.prix !== undefined) {
      sizePrice = parseFloat(item.size.prix) || 0;
    } else if (item?.prix_taille !== undefined) {
      sizePrice = parseFloat(item.prix_taille) || 0;
    }
    itemPrice += supplementsPrice + meatsPrice + saucesPrice + sizePrice;
  }
  if (item.selected_drink && (item.selected_drink.prix != null || item.selected_drink.price != null)) {
    itemPrice += parseFloat(item.selected_drink.prix ?? item.selected_drink.price ?? 0) || 0;
  }
  return Math.round(itemPrice * itemQuantity * 100) / 100;
}

export function computeCartTotalWithExtras(items = []) {
  if (!Array.isArray(items)) return 0;
  let sum = 0;
  for (const item of items) {
    sum += getItemLineTotal(item);
  }
  return Math.round(sum * 100) / 100;
}

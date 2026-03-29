/**
 * Calcul du total par ligne et du panier (prix de base + suppléments + taille + boisson + viandes/sauces).
 * Utilisé partout (page d'accueil, panier, checkout) pour que l'affichage = montant facturé.
 */

/**
 * Réconcilie le panier avec les prix actuels du menu (dashboard).
 * Garantit que Dashboard = Page = Paiement.
 * @param {Array} cartItems - Items du panier (depuis localStorage)
 * @param {Array} menuItems - Menu actuel depuis l'API
 * @returns {{ items: Array, changed: boolean }} - Panier mis à jour si des prix ont changé
 */
export function reconcileCartWithMenu(cartItems = [], menuItems = []) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return { items: cartItems, changed: false };
  if (!Array.isArray(menuItems) || menuItems.length === 0) return { items: cartItems, changed: false };

  const menuById = new Map(menuItems.map((m) => [m.id, m]));
  let changed = false;
  const reconciled = cartItems.map((cartItem) => {
    if (cartItem.is_formula || cartItem.is_combo) return cartItem; // Formules/combos: pas de réconciliation simple

    const menuItem = menuById.get(cartItem.id);
    if (!menuItem) return cartItem;

    const basePrix = parseFloat(menuItem.prix ?? menuItem.price ?? 0) || 0;
    const menuSupps = Array.isArray(menuItem.supplements) ? menuItem.supplements : [];
    const menuMeats = Array.isArray(menuItem.meat_options) ? menuItem.meat_options : [];
    const menuSauces = Array.isArray(menuItem.sauce_options) ? menuItem.sauce_options : [];
    const norm = (s) => String(s?.id ?? s?.nom ?? s?.name ?? '').toLowerCase().trim();

    let supplementsPrice = 0;
    const updatedSupplements = (cartItem.supplements || []).map((cs) => {
      const ref = menuSupps.find((ms) => norm(ms) === norm(cs) || (ms?.nom || ms?.name || '') === (cs?.nom || cs?.name || ''));
      const p = ref ? parseFloat(ref.prix ?? ref.price ?? 0) || 0 : parseFloat(cs.prix ?? cs.price ?? 0) || 0;
      if (p !== parseFloat(cs.prix ?? cs.price ?? 0)) changed = true;
      supplementsPrice += p;
      return { ...cs, prix: p, price: p };
    });

    let meatsPrice = 0;
    const updatedMeats = (cartItem.customizations?.selectedMeats || []).map((cm) => {
      const ref = menuMeats.find((mm) => norm(mm) === norm(cm));
      const p = ref ? parseFloat(ref.prix ?? ref.price ?? 0) || 0 : parseFloat(cm.prix ?? cm.price ?? 0) || 0;
      if (p !== parseFloat(cm.prix ?? cm.price ?? 0)) changed = true;
      meatsPrice += p;
      return { ...cm, prix: p, price: p };
    });

    let saucesPrice = 0;
    const updatedSauces = (cartItem.customizations?.selectedSauces || []).map((cs) => {
      const ref = menuSauces.find((ms) => norm(ms) === norm(cs));
      const p = ref ? parseFloat(ref.prix ?? ref.price ?? 0) || 0 : parseFloat(cs.prix ?? cs.price ?? 0) || 0;
      if (p !== parseFloat(cs.prix ?? cs.price ?? 0)) changed = true;
      saucesPrice += p;
      return { ...cs, prix: p, price: p };
    });

    let sizePrice = 0;
    if (cartItem.size && typeof cartItem.size === 'object' && cartItem.size.prix != null) {
      sizePrice = parseFloat(cartItem.size.prix) || 0;
    } else if (cartItem.prix_taille != null) {
      sizePrice = parseFloat(cartItem.prix_taille) || 0;
    }

    let drinkPrice = 0;
    let updatedDrink = cartItem.selected_drink;
    if (cartItem.selected_drink) {
      const drinkId = cartItem.selected_drink.id;
      const drinkFromMenu = (menuItem.drink_options || []).find((d) => d.id === drinkId);
      const drinkFromMenus = menuItems.find((m) => m.is_drink && m.id === drinkId);
      const drinkRef = drinkFromMenu || drinkFromMenus;
      drinkPrice = drinkRef ? parseFloat(drinkRef.prix ?? drinkRef.price ?? 0) || 0 : parseFloat(cartItem.selected_drink.prix ?? cartItem.selected_drink.price ?? 0) || 0;
      if (drinkRef && drinkPrice !== parseFloat(cartItem.selected_drink.prix ?? cartItem.selected_drink.price ?? 0)) {
        changed = true;
        updatedDrink = { ...cartItem.selected_drink, prix: drinkPrice, price: drinkPrice };
      }
    }

    const finalUnitPrice = Math.round((basePrix + supplementsPrice + meatsPrice + saucesPrice + sizePrice + drinkPrice) * 100) / 100;
    const oldPrix = parseFloat(cartItem.prix ?? cartItem.price ?? 0);
    if (Math.abs(finalUnitPrice - oldPrix) > 0.01) changed = true;

    return {
      ...cartItem,
      prix: finalUnitPrice,
      price: finalUnitPrice,
      supplements: updatedSupplements,
      customizations: {
        ...cartItem.customizations,
        selectedMeats: updatedMeats,
        selectedSauces: updatedSauces
      },
      selected_drink: updatedDrink,
      price_includes_extras: true
    };
  });

  return { items: reconciled, changed };
}

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

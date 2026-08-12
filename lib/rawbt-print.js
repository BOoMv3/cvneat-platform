function toEuro(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(2).replace('.', ',')} EUR`;
}

function shortId(id) {
  if (!id) return 'N/A';
  return String(id).slice(0, 8).toUpperCase();
}

function formatStatusLabel(status) {
  const raw = String(status || '').toLowerCase();
  if (raw === 'en_attente' || raw === 'pending') return 'EN ATTENTE';
  if (raw === 'acceptee' || raw === 'accepted') return 'ACCEPTEE';
  if (raw === 'en_preparation' || raw === 'preparing') return 'EN PREPARATION';
  if (raw === 'pret_a_livrer' || raw === 'ready') return 'PRETE';
  if (raw === 'en_livraison' || raw === 'delivering') return 'EN LIVRAISON';
  if (raw === 'livree' || raw === 'delivered') return 'LIVREE';
  if (raw === 'annulee' || raw === 'cancelled') return 'ANNULEE';
  return String(status || 'N/A').toUpperCase();
}

const TICKET_WIDTH = 32;

function centerText(text, width = TICKET_WIDTH) {
  const value = String(text || '');
  if (value.length >= width) return value.slice(0, width);
  const left = Math.floor((width - value.length) / 2);
  return `${' '.repeat(left)}${value}`;
}

function lineLR(left, right, width = TICKET_WIDTH) {
  const l = String(left || '');
  const r = String(right || '');
  const maxLeft = Math.max(1, width - r.length - 1);
  const clipped = l.length > maxLeft ? `${l.slice(0, Math.max(1, maxLeft - 1))}.` : l;
  const spaces = Math.max(1, width - clipped.length - r.length);
  return `${clipped}${' '.repeat(spaces)}${r}`;
}

function divider(char = '-', width = TICKET_WIDTH) {
  return char.repeat(width);
}

function wrapText(text, width = TICKET_WIDTH, indent = '') {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return [];
  const max = Math.max(8, width - indent.length);
  const out = [];
  let rest = raw;
  while (rest.length > max) {
    let cut = rest.lastIndexOf(' ', max);
    if (cut < 8) cut = max;
    out.push(indent + rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(indent + rest);
  return out;
}

/** Comme wrapText mais conserve un préfixe (ex: \"  + \"). */
function wrapPrefixed(prefix, text, width = TICKET_WIDTH) {
  const body = String(text || '').replace(/\s+/g, ' ').trim();
  if (!body) return [];
  const full = `${prefix}${body}`;
  if (full.length <= width) return [full];
  const firstMax = Math.max(4, width - prefix.length);
  const lines = [prefix + body.slice(0, firstMax).trim()];
  let rest = body.slice(firstMax).trim();
  while (rest.length > 0) {
    const chunk = rest.slice(0, width - 2);
    lines.push(`  ${chunk}`.slice(0, width));
    rest = rest.slice(chunk.length).trim();
  }
  return lines;
}

function toKitchenLabel(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function labelOf(entry) {
  if (entry == null) return '';
  if (typeof entry === 'string' || typeof entry === 'number') return String(entry);
  return (
    entry.nom ||
    entry.name ||
    entry.label ||
    entry.title ||
    entry.ingredient ||
    entry.sauce ||
    entry.meat ||
    ''
  );
}

function priceOf(entry) {
  if (entry == null || typeof entry !== 'object') return 0;
  const n = Number(
    entry.prix ??
      entry.price ??
      entry.prix_supplementaire ??
      entry.extra_price ??
      0
  );
  return Number.isFinite(n) ? n : 0;
}

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return [parsed];
    } catch (_) {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (typeof value === 'object') return [value];
  return [];
}

function parseCustomizations(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) || {};
    } catch (_) {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
}

function customerName(order) {
  const firstName = order?.customer?.firstName || order?.customer_first_name || order?.users?.prenom || '';
  const lastName = order?.customer?.lastName || order?.customer_last_name || order?.users?.nom || '';
  const full = `${firstName} ${lastName}`.trim();
  if (full) return full;
  return order?.customer?.email || order?.customer_email || order?.users?.email || 'Client';
}

function customerPhone(order) {
  return (
    order?.customer?.phone ||
    order?.customer_phone ||
    order?.users?.telephone ||
    order?.telephone ||
    ''
  );
}

function customerAddress(order) {
  return (
    order?.delivery_address ||
    order?.adresse_livraison ||
    order?.customer?.address ||
    order?.adresse ||
    ''
  );
}

function isPickupOrder(order) {
  const f = String(order?.order_fulfillment || order?.fulfillment || '').toLowerCase();
  if (f === 'pickup' || f === 'retrait') return true;
  if (order?.is_pickup === true) return true;
  return false;
}

function collectItemExtras(item) {
  const extras = [];
  const custom = parseCustomizations(item?.customizations);

  const supplements = [
    ...asList(item?.supplements),
    ...asList(custom.supplements),
    ...asList(custom.selectedSupplements),
    ...asList(custom.selected_supplements),
  ];
  for (const s of supplements) {
    const name = labelOf(s);
    if (!name) continue;
    extras.push({ kind: 'SUPP', name, price: priceOf(s) });
  }

  const meats = [
    ...asList(custom.selectedMeats),
    ...asList(custom.selected_meats),
    ...asList(custom.meats),
    ...asList(item?.selectedMeats),
  ];
  for (const m of meats) {
    const name = labelOf(m);
    if (!name) continue;
    extras.push({ kind: 'VIANDE', name, price: priceOf(m) });
  }

  const sauces = [
    ...asList(custom.selectedSauces),
    ...asList(custom.selected_sauces),
    ...asList(custom.sauces),
    ...asList(item?.selectedSauces),
  ];
  for (const s of sauces) {
    const name = labelOf(s);
    if (!name) continue;
    extras.push({ kind: 'SAUCE', name, price: priceOf(s) });
  }

  const size =
    custom.size ||
    custom.taille ||
    custom.selectedSize ||
    custom.boisson_taille ||
    item?.boisson_taille ||
    item?.taille;
  if (size) {
    const sizeName = typeof size === 'object' ? labelOf(size) : String(size);
    if (sizeName) extras.push({ kind: 'TAILLE', name: sizeName, price: priceOf(size) });
  }

  const drink =
    custom.selectedDrink ||
    custom.drink ||
    custom.boisson ||
    custom.drink_name ||
    custom.menu_drink_name;
  if (drink) {
    const drinkName = typeof drink === 'object' ? labelOf(drink) : String(drink);
    if (drinkName) extras.push({ kind: 'BOISSON', name: drinkName, price: priceOf(drink) });
  }

  const removed = [
    ...asList(custom.removedIngredients),
    ...asList(custom.removed_ingredients),
    ...asList(custom.sans),
  ];
  for (const r of removed) {
    const name = labelOf(r);
    if (!name) continue;
    extras.push({ kind: 'SANS', name, price: 0 });
  }

  const formulaDetails = asList(custom.formula_items_details || custom.formulaItems);
  for (const f of formulaDetails) {
    const name = labelOf(f);
    if (!name) continue;
    extras.push({ kind: 'MENU', name, price: priceOf(f) });
  }

  // Dédupliquer (nom+kind)
  const seen = new Set();
  return extras.filter((e) => {
    const key = `${e.kind}|${toKitchenLabel(e.name)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cvneatLogoBlock() {
  return [
    divider('='),
    centerText('CVN\'EAT'),
    centerText('LIVRAISON & RETRAIT'),
    divider('='),
  ];
}

/**
 * Ticket cuisine / caisse — 58mm (≈32 car.).
 * Inclut client, articles, suppléments / viandes / sauces / tailles / notes.
 */
export function buildOrderReceiptText(order, options = {}) {
  const now = new Date();
  const printedAt = now.toLocaleString('fr-FR');
  const printedHour = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const status = formatStatusLabel(order?.statut || order?.status);
  const pickup = isPickupOrder(order);
  const showCustomer = options.showCustomer !== false;
  const showPrices = options.showPrices !== false;
  const showTotals = options.showTotals !== false;
  const restaurantName =
    options.restaurantName ||
    order?.restaurant?.nom ||
    order?.restaurants?.nom ||
    order?.restaurant_name ||
    '';

  const lines = [];
  lines.push(...cvneatLogoBlock());
  if (restaurantName) {
    lines.push(...wrapText(toKitchenLabel(restaurantName)));
    lines.push(divider('-'));
  }

  lines.push(centerText(pickup ? '*** RETRAIT ***' : '*** LIVRAISON ***'));
  lines.push(lineLR('COMMANDE', `#${shortId(order?.id)}`));
  lines.push(lineLR('HEURE', printedHour));
  lines.push(lineLR('STATUT', status));
  lines.push(divider('='));

  if (showCustomer) {
    lines.push(centerText('CLIENT'));
    lines.push(...wrapText(toKitchenLabel(customerName(order))));
    const phone = customerPhone(order);
    if (phone) lines.push(...wrapText(`TEL: ${phone}`));
    if (!pickup) {
      const addr = customerAddress(order);
      if (addr) {
        lines.push('ADRESSE:');
        lines.push(...wrapText(toKitchenLabel(addr), TICKET_WIDTH, '  '));
      }
    } else {
      lines.push(centerText('(A EMPORTER)'));
    }
    lines.push(divider('='));
  }

  lines.push(centerText('COMMANDE'));
  lines.push(divider('-'));

  const items = Array.isArray(options.items) ? options.items : [];
  if (!items.length) {
    lines.push('1 x ARTICLE INCONNU');
  } else {
    items.forEach((item, idx) => {
      const qty = Number(item?.quantity || item?.quantite || 1) || 1;
      const name = toKitchenLabel(item?.name || item?.nom || 'ARTICLE');
      const unit = Number(item?.price || item?.prix || item?.prix_unitaire || 0);
      const lineTotal = unit * qty;

      if (showPrices) {
        lines.push(lineLR(`${qty}x ${name}`, toEuro(lineTotal)));
      } else {
        lines.push(...wrapText(`${qty}x ${name}`));
      }

      const extras = collectItemExtras(item);
      for (const ex of extras) {
        const prefix =
          ex.kind === 'SUPP'
            ? '  + '
            : ex.kind === 'SANS'
              ? '  - '
              : ex.kind === 'VIANDE'
                ? '  * '
                : ex.kind === 'SAUCE'
                  ? '  ~ '
                  : ex.kind === 'BOISSON'
                    ? '  > '
                    : ex.kind === 'TAILLE'
                      ? '  # '
                      : '  · ';
        const label = `${prefix}${toKitchenLabel(ex.name)}`;
        if (showPrices && ex.price > 0) {
          lines.push(lineLR(label, `+${toEuro(ex.price)}`));
        } else {
          lines.push(...wrapPrefixed(prefix, toKitchenLabel(ex.name)));
        }
      }

      const note = item?.instructions || item?.note || item?.customizations?.note;
      if (note) {
        lines.push(...wrapText(`  NOTE: ${toKitchenLabel(note)}`, TICKET_WIDTH, ''));
      }

      if (idx < items.length - 1) lines.push(divider('.'));
    });
  }

  const orderNote =
    order?.instructions ||
    order?.notes ||
    order?.commentaire ||
    order?.customer_note ||
    order?.note_client;
  if (orderNote) {
    lines.push(divider('-'));
    lines.push(centerText('NOTE CLIENT'));
    lines.push(...wrapText(toKitchenLabel(String(orderNote))));
  }

  if (showTotals) {
    const subtotal = Number(options.subtotal || 0);
    const deliveryFee = Number(options.deliveryFee || 0);
    const total = Number(options.total || subtotal + deliveryFee);
    lines.push(divider('='));
    if (subtotal > 0) lines.push(lineLR('SOUS-TOTAL', toEuro(subtotal)));
    if (!pickup) lines.push(lineLR('LIVRAISON', toEuro(deliveryFee)));
    lines.push(lineLR('TOTAL', toEuro(total)));
  }

  lines.push(divider('='));
  lines.push(centerText('MERCI — CVN\'EAT'));
  lines.push(centerText(printedAt));
  lines.push('');
  lines.push('');
  lines.push('');
  return lines.join('\n');
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(label || `Timeout ${ms}ms`));
    }, ms);
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export function isCapacitorNative() {
  try {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (!cap) return false;
    if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return true;
    if (typeof cap.getPlatform === 'function') {
      const p = String(cap.getPlatform() || '').toLowerCase();
      return p === 'android' || p === 'ios';
    }
    const protocol = window.location?.protocol || '';
    return protocol === 'capacitor:' || protocol === 'ionic:';
  } catch (_) {
    return false;
  }
}

/**
 * Appel bridge Capacitor sans import dynamique (plus fiable avec server.url).
 */
async function callSunmiNative(method, options) {
  const cap = window.Capacitor;
  if (!cap) throw new Error('Capacitor absent (ouvre l’app CVN’EAT, pas Chrome)');

  // 1) nativePromise (API bridge classique)
  if (typeof cap.nativePromise === 'function') {
    return withTimeout(cap.nativePromise('SunmiPrint', method, options || {}), 12000, 'Timeout imprimante Sunmi');
  }

  // 2) Plugins déjà exposés
  const existing = cap.Plugins && cap.Plugins.SunmiPrint;
  if (existing && typeof existing[method] === 'function') {
    return withTimeout(existing[method](options || {}), 12000, 'Timeout imprimante Sunmi');
  }

  // 3) registerPlugin depuis le module bundlé (si dispo)
  try {
    const core = await withTimeout(import('@capacitor/core'), 5000, 'Timeout chargement Capacitor');
    if (core && typeof core.registerPlugin === 'function') {
      const plugin = core.registerPlugin('SunmiPrint');
      if (plugin && typeof plugin[method] === 'function') {
        return withTimeout(plugin[method](options || {}), 12000, 'Timeout imprimante Sunmi');
      }
    }
  } catch (e) {
    console.warn('[print] registerPlugin fallback:', e?.message || e);
  }

  throw new Error('Plugin SunmiPrint introuvable — réinstalle l’APK CVN’EAT (build avec SunmiPrint)');
}

export async function printWithRawBt(receiptText) {
  if (typeof window === 'undefined') return false;

  const payload = encodeURIComponent(receiptText);
  try {
    window.location.href = `rawbt:${payload}`;
    return true;
  } catch (_) {}

  try {
    window.location.href =
      `intent:#Intent;action=ru.a402d.rawbtprinter.action.PRINT_RAWBT;` +
      `package=ru.a402d.rawbtprinter;` +
      `S.ru.a402d.rawbtprinter.extra.DATA=${payload};end;`;
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Impression partenaire → imprimante intégrée Sunmi (app Capacitor uniquement).
 * @returns {{ ok: boolean, method: 'sunmi'|'rawbt'|null, error?: string, detail?: string }}
 */
export async function printPartnerTicket(receiptText) {
  if (typeof window === 'undefined') {
    return { ok: false, method: null, error: 'SSR' };
  }

  const text = String(receiptText || '');
  if (!text.trim()) {
    return { ok: false, method: null, error: 'Ticket vide' };
  }

  const native = isCapacitorNative();
  const debug = {
    hasCapacitor: !!window.Capacitor,
    native,
    platform: (() => {
      try {
        return window.Capacitor?.getPlatform?.() || 'web';
      } catch (_) {
        return '?';
      }
    })(),
    hasNativePromise: typeof window.Capacitor?.nativePromise === 'function',
    hasPlugin: !!(window.Capacitor?.Plugins && window.Capacitor.Plugins.SunmiPrint),
  };
  console.log('[print] debug', debug);

  // App native → Sunmi d’abord
  if (native || window.Capacitor) {
    try {
      // Voie la plus directe (injectée dans layout, avant React)
      if (typeof window.__cvneatSunmiPrint === 'function') {
        await withTimeout(window.__cvneatSunmiPrint(text), 12000, 'Timeout imprimante Sunmi');
        return { ok: true, method: 'sunmi', detail: JSON.stringify(debug) };
      }

      await callSunmiNative('printText', { text });
      return { ok: true, method: 'sunmi', detail: JSON.stringify(debug) };
    } catch (e) {
      console.warn('[print] Sunmi failed', e?.message || e);
      if (!native) {
        return {
          ok: false,
          method: null,
          error:
            "Impression Sunmi uniquement dans l'app CVN'EAT (pas Chrome). Ouvre l'application installée.",
          detail: String(e?.message || e),
        };
      }
      return {
        ok: false,
        method: null,
        error: String(e?.message || e || 'Erreur impression Sunmi'),
        detail: JSON.stringify(debug),
      };
    }
  }

  return {
    ok: false,
    method: null,
    error:
      "Tu es dans le navigateur. L'imprimante Sunmi marche seulement dans l'app CVN'EAT.",
    detail: JSON.stringify(debug),
  };
}

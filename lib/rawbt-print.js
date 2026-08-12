function toEuro(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(2)} EUR`;
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

function centerText(text, width = 40) {
  const value = String(text || '');
  if (value.length >= width) return value;
  const left = Math.floor((width - value.length) / 2);
  return `${' '.repeat(left)}${value}`;
}

function truncateText(text, maxLength = 24) {
  const value = String(text || '');
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

function toKitchenLabel(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function customerName(order) {
  const firstName = order?.customer?.firstName || order?.customer_first_name || order?.users?.prenom || '';
  const lastName = order?.customer?.lastName || order?.customer_last_name || order?.users?.nom || '';
  const full = `${firstName} ${lastName}`.trim();
  if (full) return full;
  return order?.customer?.email || order?.customer_email || order?.users?.email || 'Client';
}

export function buildOrderReceiptText(order, options = {}) {
  const appName = options.appName || 'CVNEAT';
  const now = new Date();
  const printedAt = now.toLocaleString('fr-FR');
  const printedHour = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const lines = [];
  const divider = '--------------------------------';
  const strongDivider = '================================';
  const status = formatStatusLabel(order?.statut || order?.status);

  lines.push(centerText(`${toKitchenLabel(appName)} CUISINE`, 32));
  lines.push(`HEURE: ${printedHour}`);
  lines.push(`COMMANDE: ${shortId(order?.id)}`);
  lines.push(`STATUT: ${status}`);
  lines.push(strongDivider);
  lines.push(centerText('DIRECT', 32));
  lines.push(strongDivider);

  const items = Array.isArray(options.items) ? options.items : [];
  if (!items.length) {
    lines.push('1 ARTICLE INCONNU');
  } else {
    for (const item of items) {
      const qty = Number(item?.quantity || item?.quantite || 1);
      const name = toKitchenLabel(truncateText(item?.name || item?.nom || 'ARTICLE', 28));
      const price = Number(item?.price || item?.prix || item?.prix_unitaire || 0);
      lines.push(`${qty} ${name}`);
      if (options.showPrices === true) {
        lines.push(`   ${toEuro(price * qty)}`);
      }
    }
  }

  if (options.showCustomer === true) {
    lines.push(divider);
    lines.push(`CLIENT: ${customerName(order)}`);
    const phone = order?.customer?.phone || order?.customer_phone || order?.users?.telephone || '';
    if (phone) lines.push(`TEL: ${phone}`);
  }

  if (order?.instructions) {
    lines.push(divider);
    lines.push('NOTE');
    lines.push(toKitchenLabel(String(order.instructions)));
  }

  if (options.showTotals === true) {
    const subtotal = Number(options.subtotal || 0);
    const deliveryFee = Number(options.deliveryFee || 0);
    const total = Number(options.total || subtotal + deliveryFee);
    lines.push(divider);
    lines.push(`SOUS-TOTAL: ${toEuro(subtotal)}`);
    lines.push(`LIVRAISON : ${toEuro(deliveryFee)}`);
    lines.push(`TOTAL     : ${toEuro(total)}`);
  }

  lines.push(strongDivider);
  lines.push(centerText(toKitchenLabel(appName), 32));
  lines.push(`IMPRIME LE: ${printedAt}`);
  lines.push('\n\n\n');
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

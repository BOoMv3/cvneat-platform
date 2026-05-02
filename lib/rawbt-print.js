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

  // Style ticket cuisine (proche de l'exemple photo)
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

export async function printWithRawBt(receiptText) {
  if (typeof window === 'undefined') return false;

  const payload = encodeURIComponent(receiptText);
  const rawBtUrl = `rawbt:${payload}`;

  try {
    window.location.href = rawBtUrl;
    return true;
  } catch (_) {
    // fallback intent URL
  }

  const intentUrl =
    `intent:#Intent;action=ru.a402d.rawbtprinter.action.PRINT_RAWBT;` +
    `package=ru.a402d.rawbtprinter;` +
    `S.ru.a402d.rawbtprinter.extra.DATA=${payload};end;`;

  try {
    window.location.href = intentUrl;
    return true;
  } catch (_) {
    return false;
  }
}

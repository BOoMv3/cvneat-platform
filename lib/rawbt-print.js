function toEuro(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(2)} EUR`;
}

function shortId(id) {
  if (!id) return 'N/A';
  return String(id).slice(0, 8).toUpperCase();
}

function customerName(order) {
  const firstName = order?.customer?.firstName || order?.customer_first_name || order?.users?.prenom || '';
  const lastName = order?.customer?.lastName || order?.customer_last_name || order?.users?.nom || '';
  const full = `${firstName} ${lastName}`.trim();
  if (full) return full;
  return order?.customer?.email || order?.customer_email || order?.users?.email || 'Client';
}

export function buildOrderReceiptText(order, options = {}) {
  const appName = options.appName || "CVN'EAT";
  const printedAt = new Date().toLocaleString('fr-FR');
  const lines = [];

  lines.push(`${appName} - Ticket commande`);
  lines.push('--------------------------------');
  lines.push(`Commande: #${shortId(order?.id)}`);
  lines.push(`Date: ${printedAt}`);
  lines.push(`Statut: ${order?.statut || order?.status || 'N/A'}`);
  lines.push(`Client: ${customerName(order)}`);

  const phone = order?.customer?.phone || order?.customer_phone || order?.users?.telephone || '';
  if (phone) lines.push(`Tel: ${phone}`);

  const address = order?.adresse_livraison || '';
  const city = order?.ville || '';
  const postalCode = order?.code_postal || '';
  if (address || city || postalCode) {
    lines.push('--------------------------------');
    lines.push('Livraison:');
    if (address) lines.push(address);
    if (city || postalCode) lines.push(`${postalCode} ${city}`.trim());
  }

  lines.push('--------------------------------');
  lines.push('Articles:');
  const items = Array.isArray(options.items) ? options.items : [];
  if (!items.length) {
    lines.push('- Aucun article');
  } else {
    for (const item of items) {
      const qty = Number(item?.quantity || item?.quantite || 1);
      const name = item?.name || item?.nom || 'Article';
      const price = Number(item?.price || item?.prix || item?.prix_unitaire || 0);
      lines.push(`${qty} x ${name}  ${toEuro(price * qty)}`);
    }
  }

  const subtotal = Number(options.subtotal || 0);
  const deliveryFee = Number(options.deliveryFee || 0);
  const total = Number(options.total || subtotal + deliveryFee);
  lines.push('--------------------------------');
  lines.push(`Sous-total: ${toEuro(subtotal)}`);
  lines.push(`Livraison: ${toEuro(deliveryFee)}`);
  lines.push(`TOTAL: ${toEuro(total)}`);

  if (order?.instructions) {
    lines.push('--------------------------------');
    lines.push('Instructions:');
    lines.push(String(order.instructions));
  }

  lines.push('--------------------------------');
  lines.push('Merci !');
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

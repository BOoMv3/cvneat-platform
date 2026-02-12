function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0.00';
  return x.toFixed(2);
}

function safeStr(v) {
  return (v ?? '').toString().trim();
}

function line(max = 32) {
  return '-'.repeat(Math.max(8, Math.min(48, max)));
}

/**
 * Format a paid order as a receipt text for ESC/POS thermal printers.
 * Output uses DantSu ESC/POS formatted markup ([L]/[C]/[R]) for best alignment.
 */
export function formatReceiptText({
  restaurant,
  order,
  items = [],
  now = new Date(),
}) {
  const restoName = safeStr(restaurant?.nom || restaurant?.name || 'Restaurant');
  const orderShort = safeStr(order?.order_number) || safeStr(order?.id).slice(0, 8) || 'N/A';
  const createdAt = order?.created_at ? new Date(order.created_at) : now;
  const dateStr = createdAt.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

  const subtotal = Number(order?.total ?? 0) || 0;
  const discount = Number(order?.discount_amount ?? 0) || 0;
  const deliveryFee = Number(order?.frais_livraison ?? 0) || 0;
  const platformFee = Number(order?.platform_fee ?? 0) || 0;
  const totalPaid =
    Number(order?.total_paid ?? 0) ||
    Math.max(0, subtotal - Math.min(discount, subtotal)) + deliveryFee + platformFee;

  const customerName = safeStr(order?.customer_name)
    || `${safeStr(order?.customer_first_name)} ${safeStr(order?.customer_last_name)}`.trim();
  const customerPhone = safeStr(order?.customer_phone);
  const customerEmail = safeStr(order?.customer_email);
  const address = safeStr(order?.adresse_livraison);
  const city = safeStr(order?.ville_livraison);

  const lines = [];
  lines.push('[C]<b>CVNEAT</b>');
  lines.push(`[C]${restoName}`);
  lines.push('[C]' + line(32));
  lines.push(`[L]<b>Commande #${orderShort}</b>`);
  lines.push(`[L]${dateStr}`);
  lines.push('[C]' + line(32));

  if (Array.isArray(items) && items.length > 0) {
    for (const it of items) {
      const qty = Number(it?.quantity ?? it?.quantite ?? 1) || 1;
      const name = safeStr(it?.name ?? it?.nom ?? it?.menus?.nom ?? 'Article');
      const price = Number(it?.price ?? it?.prix_unitaire ?? it?.menus?.prix ?? 0) || 0;
      const rowTotal = price * qty;
      // Clamp overly long names to keep layout readable
      const shortName = name.length > 24 ? name.slice(0, 23) + '…' : name;
      lines.push(`[L]${qty}x ${shortName}[R]${money(rowTotal)}€`);
    }
  } else {
    lines.push('[L]Détails indisponibles');
  }

  lines.push('[C]' + line(32));
  lines.push(`[L]Sous-total[R]${money(subtotal)}€`);
  if (discount > 0) {
    lines.push(`[L]Réduction[R]-${money(Math.min(discount, subtotal))}€`);
  }
  if (deliveryFee > 0) {
    lines.push(`[L]Livraison[R]${money(deliveryFee)}€`);
  }
  if (platformFee > 0) {
    lines.push(`[L]Frais plateforme[R]${money(platformFee)}€`);
  }
  lines.push(`[L]<b>TOTAL</b>[R]<b>${money(totalPaid)}€</b>`);
  lines.push('[C]' + line(32));

  if (customerName || customerPhone || customerEmail) {
    lines.push('[L]<b>Client</b>');
    if (customerName) lines.push(`[L]${customerName}`);
    if (customerPhone) lines.push(`[L]${customerPhone}`);
    if (customerEmail) lines.push(`[L]${customerEmail}`);
  }

  if (address || city) {
    lines.push('[L]<b>Livraison</b>');
    if (address) lines.push(`[L]${address}`);
    if (city) lines.push(`[L]${city}`);
  }

  lines.push('\n');
  lines.push('[C]Merci et bon service !');
  lines.push('\n\n\n'); // feed

  return lines.join('\n');
}


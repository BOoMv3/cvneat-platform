import emailService from '@/lib/emailService';
import { formatSlotRangeParis, getEffectiveDeliverySlot } from '@/lib/delivery-slots';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cvneat.fr').replace(/\/$/, '');

function resolveCustomerEmail(order) {
  return (
    order?.customer_email?.trim() ||
    order?.users?.email?.trim() ||
    null
  );
}

function buildEmailHtml({ title, bodyLines, orderId, trackUrl }) {
  const lines = bodyLines.map((l) => `<p style="margin:0 0 12px;font-size:15px;color:#333;">${l}</p>`).join('');
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="color:#ea580c;font-size:20px;margin:0 0 16px;">${title}</h1>
      ${lines}
      <p style="margin:20px 0 0;">
        <a href="${trackUrl}" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Voir ma commande
        </a>
      </p>
      <p style="margin:16px 0 0;font-size:12px;color:#666;">Commande #${String(orderId).slice(0, 8)} — CVN'EAT</p>
    </div>
  `;
}

/**
 * @param {'confirm'|'propose'|'fallback_asap'} event
 */
export async function notifyCustomerDeliverySlotChange(order, event, { restaurantName } = {}) {
  const to = resolveCustomerEmail(order);
  if (!to) {
    console.warn('📭 Pas d’email client pour notification créneau, commande', order?.id);
    return { sent: false, reason: 'no_email' };
  }

  const slot = getEffectiveDeliverySlot(order);
  const trackUrl = `${SITE_URL}/track/${order.id}`;
  const resto = restaurantName || order?.restaurants?.nom || 'le restaurant';

  let subject = 'Votre créneau de livraison — CVN\'EAT';
  let title = 'Créneau de livraison';
  let bodyLines = [];

  if (event === 'confirm') {
    subject = `Livraison confirmée ${slot?.label ? `(${slot.label})` : ''} — CVN'EAT`;
    title = 'Créneau confirmé ✅';
    bodyLines = [
      `${resto} a confirmé votre créneau de livraison : <strong>${slot?.label || 'au plus tôt'}</strong>.`,
      'Votre commande sera préparée pour cette plage horaire (sous réserve des aléas de route).',
    ];
  } else if (event === 'propose') {
    subject = `Nouveau créneau de livraison ${slot?.label ? `(${slot.label})` : ''} — CVN'EAT`;
    title = 'Horaire de livraison ajusté';
    bodyLines = [
      `Votre créneau initial n’était pas possible. ${resto} vous propose : <strong>${slot?.label || 'un autre créneau'}</strong>.`,
      '<strong>Ce créneau est confirmé automatiquement</strong> pour que la livraison puisse avancer (vous n’avez rien à faire sur le site).',
      'En cas de souci, contactez le restaurant ou CVN’EAT au plus vite.',
    ];
    if (order?.delivery_slot_partner_note) {
      bodyLines.push(`Message du restaurant : « ${order.delivery_slot_partner_note} »`);
    }
  } else if (event === 'fallback_asap') {
    subject = 'Livraison au plus tôt — CVN\'EAT';
    title = 'Livraison au plus tôt';
    bodyLines = [
      `${resto} ne peut pas tenir le créneau demandé. Votre commande sera livrée <strong>au plus tôt</strong>.`,
    ];
    if (order?.delivery_slot_partner_note) {
      bodyLines.push(`Message : « ${order.delivery_slot_partner_note} »`);
    }
  }

  try {
    await emailService.sendEmail({
      to,
      subject,
      html: buildEmailHtml({ title, bodyLines, orderId: order.id, trackUrl }),
      text: bodyLines.join('\n') + `\n\nSuivi : ${trackUrl}`,
    });
    return { sent: true };
  } catch (e) {
    console.error('❌ Email créneau livraison:', e?.message || e);
    return { sent: false, reason: e?.message };
  }
}

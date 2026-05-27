/** Incrémenter pour réafficher le message obligatoire à tous les partenaires. */
export const PARTNER_IMPORTANT_INFO_VERSION = '2026-05-27-v1';

export const PARTNER_IMPORTANT_INFO_ACK_KEY = `cvneat_partner_info_ack_${PARTNER_IMPORTANT_INFO_VERSION}`;

export function hasAcknowledgedPartnerImportantInfo() {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(PARTNER_IMPORTANT_INFO_ACK_KEY) === '1';
  } catch {
    return false;
  }
}

export function acknowledgePartnerImportantInfo() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PARTNER_IMPORTANT_INFO_ACK_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
}

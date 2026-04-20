function normalizeText(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BLOCKED_ADDRESS_PATTERNS = [
  'mas de lamalou',
];

const BLOCKED_CITY_PATTERNS = [
  'brissac',
];

export function isBlockedDeliveryAddress(address, city = '') {
  const addressN = normalizeText(address);
  const cityN = normalizeText(city);
  if (!addressN) return false;

  const hasBlockedAddress = BLOCKED_ADDRESS_PATTERNS.some((p) => addressN.includes(p));
  if (!hasBlockedAddress) return false;

  const combined = `${addressN} ${cityN}`.trim();
  const hasBlockedCity = BLOCKED_CITY_PATTERNS.some(
    (p) => combined.includes(p) || cityN.includes(p)
  );
  return hasBlockedCity;
}

export function isCazilhacAddress(address, city = '') {
  const combined = `${normalizeText(address)} ${normalizeText(city)}`.trim();
  return combined.includes('cazilhac');
}

export const CAZILHAC_TEMP_SURCHARGE_EUR = 2.5;
export const CAZILHAC_TEMP_NOTICE =
  'En raison des travaux sur le pont de Cazilhac, les frais de livraison augmentent temporairement de 2,50€. Les tarifs reviendront à la normale après la fin des travaux.';

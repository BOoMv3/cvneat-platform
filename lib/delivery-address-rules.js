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

/**
 * Détecte Cazilhac même avec fautes de saisie fréquentes (ex. « Cazhillac » avec double « h »),
 * pour aligner le forfait 5 €.
 */
export function referencesCazilhacInText(address, city = '') {
  const combined = `${normalizeText(address)} ${normalizeText(city)}`.trim();
  if (!combined) return false;
  if (combined.includes('cazilhac')) return true;
  if (combined.includes('cazhillac')) return true;
  return false;
}

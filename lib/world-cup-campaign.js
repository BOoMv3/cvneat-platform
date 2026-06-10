/** Campagne Coupe du Monde 2026 — active via WORLD_CUP_MODE=true ou à partir du 11 juin 2026 */

export const WORLD_CUP_START = new Date('2026-06-11T00:00:00+02:00');
export const WORLD_CUP_END = new Date('2026-07-19T23:59:59+02:00');

export const WORLD_CUP_PRIZES = [
  {
    id: 'tv',
    title: 'TV 55" 4K',
    subtitle: 'Pour vivre chaque match comme au stade',
    emoji: '📺',
    image: '/world-cup/lot-tv.webp',
    tier: 'grand',
  },
  {
    id: 'maillot',
    title: 'Maillot officiel',
    subtitle: 'Équipe de France — édition authentique',
    emoji: '👕',
    image: '/world-cup/lot-maillot.webp',
    tier: 'gold',
  },
  {
    id: 'ballon',
    title: 'Ballon officiel CDM',
    subtitle: 'Le ballon Trionda de la Coupe du Monde 2026',
    emoji: '⚽',
    image: '/world-cup/lot-ballon.webp',
    tier: 'gold',
  },
  {
    id: 'bons',
    title: '10 × 30€ de commandes',
    subtitle: 'Bons CVN\'EAT offerts chaque semaine',
    emoji: '🎁',
    image: '/world-cup/lot-bons.webp',
    tier: 'weekly',
  },
];

export const WORLD_CUP_BALL_SRC = '/world-cup/lot-ballon.webp';

export const WORLD_CUP_RULES = [
  '1 commande validée = 1 code unique (ex: CDM-A1B2C3D4) visible dans ton espace client.',
  'Commande minimum 15€ pendant toute la compétition (11 juin → 19 juillet).',
  'Tirage final le 20 juillet 2026 — les gagnants sont contactés par e-mail.',
  'Lots non échangeables. Plus tu commandes, plus tu cumules de codes.',
];

export function isWorldCupModeEnabled(now = new Date()) {
  const forced = (process.env.WORLD_CUP_MODE || '')
    .toString()
    .trim()
    .toLowerCase();
  if (forced === 'true' || forced === '1' || forced === 'yes') return true;
  if (forced === 'false' || forced === '0' || forced === 'no') return false;
  return now >= WORLD_CUP_START && now <= WORLD_CUP_END;
}

/** Seuls les espaces pro (admin / partenaire / livreur) restent sans déco CDM */
export const WORLD_CUP_SKIP_PREFIXES = [
  '/admin',
  '/partner',
  '/delivery',
  '/restaurant/dashboard',
  '/restaurant/orders',
  '/restaurant/menu',
  '/restaurant/settings',
  '/maintenance',
];

export function shouldShowWorldCupChrome(pathname = '') {
  if (!pathname) return true;
  return !WORLD_CUP_SKIP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

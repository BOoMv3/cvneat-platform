const DEFAULT_MESSAGE =
  "Le service de commande est temporairement suspendu : nous rencontrons des difficultés avec la livraison ce soir. Toutes nos excuses pour la gêne occasionnée. Les commandes déjà passées restent suivables. Réouverture dès que possible.";

export function isSiteMaintenanceEnabled() {
  const value = (process.env.SITE_MAINTENANCE_MODE || '')
    .toString()
    .trim()
    .toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

export function getMaintenanceMessage() {
  const custom =
    process.env.SITE_MAINTENANCE_MESSAGE ||
    process.env.NEXT_PUBLIC_SITE_MAINTENANCE_MESSAGE;
  return (custom || DEFAULT_MESSAGE).trim();
}

const PAGE_PREFIXES = [
  '/maintenance',
  '/login',
  '/auth',
  '/admin',
  '/partner',
  '/delivery',
  '/track-order',
  '/track/',
  '/order-confirmation/',
  '/orders/',
  '/profile/orders',
  '/chat/',
  '/chat-admin/',
  '/complaint/',
  '/mentions-legales',
  '/cgv',
  '/politique-confidentialite',
  '/track-order-admin',
];

const PARTNER_RESTAURANT_PREFIXES = [
  '/restaurant/dashboard',
  '/restaurant/orders',
  '/restaurant/menu',
  '/restaurant/settings',
];

const API_PREFIXES = [
  '/api/site-status',
  '/api/admin',
  '/api/partner',
  '/api/restaurants/orders',
  '/api/delivery',
  '/api/stripe/webhook',
  '/api/auth',
  '/api/notifications',
  '/api/email',
];

export function isPageAllowedDuringMaintenance(pathname) {
  if (PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return true;
  }
  return PARTNER_RESTAURANT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isApiAllowedDuringMaintenance(pathname, method = 'GET') {
  if (API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  if (pathname.startsWith('/api/orders/')) {
    return true;
  }

  if (pathname === '/api/payment/confirm' && method !== 'GET') {
    return true;
  }

  return false;
}

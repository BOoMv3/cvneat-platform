import { hardNavigate } from './compat';

/** Redirection login partenaire — navigation HTML (Android 7.1). */
export function goPartnerLogin() {
  hardNavigate('/login');
}

export function goPartnerHome() {
  hardNavigate('/partner');
}

export function goPartnerPath(path) {
  if (!path || typeof path !== 'string') return;
  hardNavigate(path.startsWith('/') ? path : `/${path}`);
}

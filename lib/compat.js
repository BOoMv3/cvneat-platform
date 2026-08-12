/**
 * Compatibilité navigateurs anciens (Sunmi Android 7.1 / Chrome 51–59).
 * Utiliser pour fetch timeout, navigation hard, détection WebView legacy.
 */

export function isLegacyAndroid() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const m = ua.match(/Android\s([0-9.]+)/i);
  if (!m) return false;
  const v = parseFloat(m[1]);
  return !Number.isNaN(v) && v <= 7.1;
}

export function isLegacyWebView() {
  if (typeof window === 'undefined') return false;
  if (isLegacyAndroid()) return true;
  try {
    // APIs récentes absentes sur vieux WebView
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout !== 'function') return true;
  } catch (_) {}
  return false;
}

/** Navigation full-page (fiable sans router Next sur vieux Android). */
export function hardNavigate(url) {
  if (typeof window === 'undefined' || !url) return;
  try {
    window.location.assign(url);
  } catch (_) {
    window.location.href = url;
  }
}

/** fetch avec timeout sans AbortSignal.timeout (Chrome < 103). */
export function fetchWithTimeout(url, options, timeoutMs) {
  const ms = typeof timeoutMs === 'number' ? timeoutMs : 8000;
  const opts = options ? { ...options } : {};

  if (typeof AbortController === 'undefined') {
    return fetch(url, opts);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    try {
      controller.abort();
    } catch (_) {}
  }, ms);

  opts.signal = controller.signal;

  return fetch(url, opts).finally(() => {
    clearTimeout(timer);
  });
}

/** Après login : toujours hard-nav (Sunmi + app Capacitor). */
export function navigateAfterLogin(url) {
  hardNavigate(url);
}

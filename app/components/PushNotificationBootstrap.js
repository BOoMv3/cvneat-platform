'use client';

import { useEffect } from 'react';
import { initPushNotifications, isNativeApp } from '@/lib/capacitor-push-notifications';

async function hideNativeSplashSoon() {
  try {
    if (typeof window === 'undefined' || !window.Capacitor) return;
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 0 });
  } catch {
    // ignore si plugin absent
  }
}

/**
 * Initialise les push natifs (APNs/FCM) dans l'app Capacitor, sans afficher de UI.
 * Important (Sunmi / server.url) : window.Capacitor peut arriver APRÈS l'hydratation,
 * donc on retente plusieurs fois au lieu d'abandonner au 1er tick.
 */
export default function PushNotificationBootstrap() {
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const maxTries = 20; // ~10s

    // Masquer le splash natif dès que possible (évite écran logo bloqué)
    hideNativeSplashSoon();
    const splashRetry = setInterval(() => {
      if (cancelled) return;
      hideNativeSplashSoon();
    }, 400);
    const splashStop = setTimeout(() => clearInterval(splashRetry), 4000);

    const attempt = () => {
      if (cancelled) return;
      tries += 1;
      try {
        if (!isNativeApp()) {
          if (tries < maxTries) {
            setTimeout(attempt, 500);
          }
          return;
        }
        hideNativeSplashSoon();
        initPushNotifications().catch((err) => {
          if (!cancelled) console.warn('Push bootstrap (non bloquant):', err?.message || err);
        });
      } catch (e) {
        if (!cancelled) console.warn('Push bootstrap init (non bloquant):', e?.message || e);
        if (tries < maxTries) setTimeout(attempt, 500);
      }
    };

    attempt();
    return () => {
      cancelled = true;
      clearInterval(splashRetry);
      clearTimeout(splashStop);
    };
  }, []);

  return null;
}

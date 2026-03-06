'use client';

import { useEffect } from 'react';
import { initPushNotifications, isNativeApp } from '@/lib/capacitor-push-notifications';

/**
 * Initialise les push natifs (APNs/FCM) dans l'app Capacitor, sans afficher de UI.
 * Permet d'enregistrer le token dès que possible.
 * Sécurisé pour éviter tout plantage Android (try/catch autour de l'init).
 */
export default function PushNotificationBootstrap() {
  useEffect(() => {
    let cancelled = false;
    try {
      if (!isNativeApp()) return;
      initPushNotifications()
        .catch((err) => {
          if (!cancelled) console.warn('Push bootstrap (non bloquant):', err?.message || err);
        });
    } catch (e) {
      // Init synchrone qui throw (ex: Android plugin non dispo) — ne pas faire crasher l'app
      if (!cancelled) console.warn('Push bootstrap init (non bloquant):', e?.message || e);
    }
    return () => { cancelled = true; };
  }, []);

  return null;
}

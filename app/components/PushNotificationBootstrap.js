'use client';

import { useEffect } from 'react';
import { initPushNotifications, isNativeApp } from '@/lib/capacitor-push-notifications';

/**
 * Initialise les push natifs (APNs/FCM) dans l'app Capacitor, sans afficher de UI.
 * Permet d'enregistrer le token dès que possible.
 */
export default function PushNotificationBootstrap() {
  useEffect(() => {
    if (!isNativeApp()) return;

    initPushNotifications().catch((err) => {
      console.error('❌ Push bootstrap error:', err);
    });
  }, []);

  return null;
}

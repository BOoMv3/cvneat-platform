/**
 * Service de notifications push natives pour Capacitor
 * Fonctionne UNIQUEMENT dans l'app mobile (pas sur le site web)
 * N'impacte pas le fonctionnement du site web
 */

// Détection si on est dans une app Capacitor native (ne jamais throw pour éviter plantage Android)
export const isNativeApp = () => {
  try {
    if (typeof window === 'undefined') return false;
    const isNative = window.Capacitor?.isNativePlatform?.() || false;
    const isCapacitorScheme =
      window.location?.protocol === 'capacitor:' ||
      (window.location?.href && window.location.href.startsWith('capacitor://'));
    return isNative || isCapacitorScheme || !!window.Capacitor;
  } catch (e) {
    return false;
  }
};

// Initialisation des push notifications (appelé uniquement dans l'app native)
export const initPushNotifications = async () => {
  // Ne rien faire si on n'est pas dans l'app native
  if (!isNativeApp()) {
    console.log('Push notifications natives: Non disponible (site web)');
    return null;
  }

  try {
    // Import dynamique pour éviter les erreurs sur le site web
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Vérifier les permissions
    let permStatus = await PushNotifications.checkPermissions();
    console.log('🔔 Push checkPermissions:', permStatus);

    if (permStatus.receive !== 'granted') {
      const newStatus = await PushNotifications.requestPermissions();
      permStatus = newStatus;
      console.log('🔔 Push requestPermissions:', permStatus);
    }

    if (permStatus.receive !== 'granted') {
      console.log('Permissions push non accordées (ou refusées)');
      return null;
    }

    // Écouter les événements
    // IMPORTANT: ajouter les listeners AVANT register(), sinon on peut rater "registration" sur iOS.
    let sawRegistration = false;
    PushNotifications.addListener('registration', (token) => {
      sawRegistration = true;
      console.log('Token push reçu:', token.value);
      // Envoyer le token au serveur pour l'associer à l'utilisateur
      saveTokenToServer(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Erreur enregistrement push:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notification reçue:', notification);
      // La notification est affichée automatiquement par le système
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Action sur notification:', action);
      // Gérer le clic sur la notification
      handleNotificationClick(action.notification);
    });

    // Enregistrer pour les notifications push
    await PushNotifications.register();

    console.log('Push notifications natives initialisées');

    // Diagnostic: si aucun token après quelques secondes, on log (pour debug iOS)
    setTimeout(() => {
      if (!sawRegistration) {
        console.warn('⚠️ Push register appelé mais aucun événement "registration" reçu (token manquant). Vérifier APNs/entitlements/provisioning.');
      }
    }, 6000);

    // Si le token a été reçu avant login, on le rattache au user dès qu'une session existe
    // + On tente aussi immédiatement (cas fréquent: token déjà stocké + user déjà loggé)
    try {
      const { supabase } = await import('@/lib/supabase');

      // Associer le token stocké au user courant, sans spammer
      const tryAssociateStoredToken = async (reason) => {
        try {
          const { data } = await supabase.auth.getSession();
          const session = data?.session;
          if (!session?.access_token) return;
          let storedToken = null;
          try {
            storedToken = localStorage.getItem('native-push-token');
          } catch (e) {
            // ignore
          }
          if (storedToken) {
            console.log(`🔄 Réassociation token push (${reason}) ...`);
            await saveTokenToServer(storedToken);
          }
        } catch (e) {
          // ignore
        }
      };

      const tryReassociateNow = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const session = data?.session;
          if (!session?.access_token) return;
          let storedToken = null;
          try {
            storedToken = localStorage.getItem('native-push-token');
          } catch (e) {
            // ignore
          }
          if (storedToken) {
            console.log('🔄 Réassociation token push (startup) ...');
            await saveTokenToServer(storedToken);
          }
        } catch (e) {
          // ignore
        }
      };

      // Tentative immédiate au démarrage
      tryReassociateNow();

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.access_token) return;
        // IMPORTANT:
        // Beaucoup de bugs "je reçois les notifs d'un autre livreur" viennent d'une association token→user
        // qui n'a pas été mise à jour après logout/login sur le même téléphone.
        // On tente donc systématiquement de réassocier le token stocké au user courant.
        await tryAssociateStoredToken('authStateChange');
      });
    } catch (e) {
      // ignore
    }
    return true;

  } catch (error) {
    console.error('Erreur init push notifications:', error);
    return null;
  }
};

// Sauvegarder le token push (FCM pour Android, APNs pour iOS) sur le serveur
const saveTokenToServer = async (token) => {
  try {
    const platform = getPlatform();
    console.log(`📱 Enregistrement token ${platform}:`, token.substring(0, 20) + '...');

    const ASSOC_CACHE_KEY = 'cvneat-push-token-assoc';

    // Associer le token au bon user_id (sinon impossible d'envoyer un push ciblé par rôle)
    let accessToken = null;
    let userId = null;
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase.auth.getSession();
      accessToken = data?.session?.access_token || null;
      userId = data?.session?.user?.id || null;
    } catch (e) {
      // ignore
    }

    // Toujours garder une copie locale du token (utile si reçu avant login ET pour réassociation après relog)
    try {
      if (typeof window !== 'undefined' && token) {
        localStorage.setItem('native-push-token', token);
      }
    } catch (e) {
      // ignore
    }

    if (!accessToken) {
      console.log('ℹ️ Pas de session Supabase: enregistrement token reporté.');
      return;
    }

    // Anti-spam: si on a déjà associé ce token à ce user récemment, ne pas répéter
    try {
      if (userId) {
        const raw = localStorage.getItem(ASSOC_CACHE_KEY);
        const cached = raw ? JSON.parse(raw) : null;
        const same =
          cached &&
          cached.token === token &&
          cached.userId === userId &&
          cached.platform === platform &&
          typeof cached.at === 'number' &&
          Date.now() - cached.at < 12 * 60 * 60 * 1000; // 12h
        if (same) {
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    // ✅ Chemin le plus fiable en app mobile (static export):
    // enregistrer DIRECTEMENT dans Supabase via RLS (auth.uid() = user_id)
    // Ça évite de dépendre des routes Next.js /api qui ne sont pas servies localement en export statique.
    try {
      const { supabase } = await import('@/lib/supabase');
      if (userId) {
        const nowIso = new Date().toISOString();
        const { error: upsertError } = await supabase
          .from('device_tokens')
          .upsert(
            {
              token,
              user_id: userId,
              platform,
              updated_at: nowIso,
              created_at: nowIso,
            },
            { onConflict: 'token' }
          );

        if (!upsertError) {
          console.log('✅ Token enregistré dans Supabase (direct RLS)');
          try {
            localStorage.setItem(
              ASSOC_CACHE_KEY,
              JSON.stringify({ token, userId, platform, at: Date.now() })
            );
          } catch (e) {}
          return;
        }

        console.warn('⚠️ Échec enregistrement token (direct Supabase), fallback API:', {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint,
        });
      } else {
        console.warn('⚠️ Session OK mais userId manquant, fallback API');
      }
    } catch (e) {
      console.warn('⚠️ Erreur enregistrement token (direct Supabase), fallback API:', e?.message || e);
    }

    const headers = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Fallback API (utile pour centraliser côté serveur si besoin)
    const response = await fetch('/api/notifications/register-device', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        token,
        platform: platform
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erreur sauvegarde token:', errorData.error || 'Erreur inconnue');
    } else {
      const okData = await response.json().catch(() => ({}));
      console.log('✅ Token enregistré via API:', okData);
      try {
        if (userId) {
          localStorage.setItem(
            ASSOC_CACHE_KEY,
            JSON.stringify({ token, userId, platform, at: Date.now() })
          );
        }
      } catch (e) {}
    }
  } catch (error) {
    console.error('❌ Erreur envoi token:', error);
  }
};

// Obtenir la plateforme (android/ios) — ne jamais throw
const getPlatform = () => {
  try {
    if (typeof window === 'undefined') return 'web';
    const p = window.Capacitor?.getPlatform?.() || 'web';
    if (p && p !== 'web') return p;
    if (isNativeApp()) {
      const ua = (navigator?.userAgent || '').toLowerCase();
      if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
      if (ua.includes('android')) return 'android';
    }
  } catch (e) {
    // ignore
  }
  return 'web';
};

const PENDING_NOTIFICATION_URL_KEY = 'cvneat-pending-notification-url';

// Stocker l'URL cible pour que AppAutoRedirect puisse rediriger si la navigation échoue (iOS cold start)
const setPendingNotificationUrl = (url) => {
  try {
    if (typeof sessionStorage !== 'undefined' && url) {
      sessionStorage.setItem(PENDING_NOTIFICATION_URL_KEY, url);
    }
  } catch (e) {
    // ignore
  }
};

export const getPendingNotificationUrl = () => {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const url = sessionStorage.getItem(PENDING_NOTIFICATION_URL_KEY);
    if (url) {
      sessionStorage.removeItem(PENDING_NOTIFICATION_URL_KEY);
      return url;
    }
  } catch (e) {
    // ignore
  }
  return null;
};

// Gérer le clic sur une notification
const handleNotificationClick = (notification) => {
  const data = notification.data || {};
  let targetUrl = '';

  // Priorité 1: utiliser data.url si fourni par le backend
  const url = (data.url || '').toString().trim();
  if (url && url.startsWith('/')) {
    targetUrl = url;
  } else if (data.type === 'new_order') {
    targetUrl = '/partner/orders';
  } else if (data.type === 'delivery_available' || data.type === 'new_order_available') {
    targetUrl = '/delivery/dashboard';
  } else if (data.orderId) {
    targetUrl = `/orders/${data.orderId}`;
  }

  if (!targetUrl) return;

  // Stocker d'abord pour qu'AppAutoRedirect puisse rediriger si on est encore sur / (iOS)
  setPendingNotificationUrl(targetUrl);
  try {
    window.location.replace(targetUrl);
  } catch (e) {
    try {
      window.location.href = targetUrl;
    } catch (e2) {
      // ignore
    }
  }
};

// Désinscrire des notifications
export const unregisterPushNotifications = async () => {
  if (!isNativeApp()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllListeners();
    console.log('Push notifications désactivées');
  } catch (error) {
    console.error('Erreur désactivation push:', error);
  }
};

